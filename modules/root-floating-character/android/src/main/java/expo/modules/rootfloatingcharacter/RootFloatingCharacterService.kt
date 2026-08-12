package expo.modules.rootfloatingcharacter

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.content.res.Configuration
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.SystemClock
import android.provider.Settings
import android.view.Gravity
import android.view.MotionEvent
import android.view.ScaleGestureDetector
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import kotlin.math.abs
import kotlin.random.Random
import org.json.JSONArray
import org.json.JSONObject

// CHARACTER_V101A_ANDROID_FLOATING_CHARACTER_SERVICE
// CHARACTER_V101C_FLOATING_MOTION_SCALE
// CHARACTER_V101D_WALK_STATE_ANIMATION
// CHARACTER_V101E_GOAL_SPEECH_INTERACTION
// CHARACTER_V101F_GOAL_COMPLETION_CELEBRATION
// CHARACTER_V101G_LIFESTYLE_REACTION_TRAITS
// CHARACTER_V101H_TIME_STATE_CONTEXT_SPEECH
// CHARACTER_V101I_QUIET_SLEEP_MODE
// CHARACTER_V101J_BEHAVIOR_ANIMATION_STATE_MACHINE
// CHARACTER_V101K_SCREEN_EDGE_LIFE_AVOIDANCE
// CHARACTER_V101L_FINAL_STABILITY_HARDENING
// CHARACTER_V101M_BOOT_PACKAGE_RECOVERY
// CHARACTER_V101N_HOME_FLOATING_HANDOFF
// CHARACTER_V101O_RUNTIME_HEALTH_CONTROLS
class RootFloatingCharacterService : Service() {
  private data class GoalCompletion(
    val id: String,
    val title: String,
    val dateKey: String
  ) {
    val key: String
      get() =
        "$dateKey|$id"
  }

  companion object {
    private const val ACTION_START = "root.floating.START"
    private const val ACTION_STOP = "root.floating.STOP"
    private const val ACTION_UPDATE = "root.floating.UPDATE"
    private const val ACTION_SET_SCALE = "root.floating.SET_SCALE"
    private const val ACTION_SET_AUTO_MOVE = "root.floating.SET_AUTO_MOVE"
    private const val ACTION_SET_HOME_HANDOFF = "root.floating.SET_HOME_HANDOFF"
    private const val ACTION_REPAIR_RUNTIME = "root.floating.REPAIR_RUNTIME"
    private const val ACTION_RESET_POSITION = "root.floating.RESET_POSITION"
    private const val ACTION_SET_GOAL_SNAPSHOT = "root.floating.SET_GOAL_SNAPSHOT"
    private const val ACTION_SET_GOAL_SPEECH = "root.floating.SET_GOAL_SPEECH"
    private const val ACTION_SHOW_GOAL_SPEECH_NOW = "root.floating.SHOW_GOAL_SPEECH_NOW"
    private const val ACTION_SET_GOAL_COMPLETION_SNAPSHOT = "root.floating.SET_GOAL_COMPLETION_SNAPSHOT"
    private const val ACTION_SET_LIFESTYLE_CONTEXT = "root.floating.SET_LIFESTYLE_CONTEXT"
    private const val ACTION_SET_QUIET_SCHEDULE = "root.floating.SET_QUIET_SCHEDULE"
    private const val ACTION_SET_QUIET_UNTIL = "root.floating.SET_QUIET_UNTIL"

    private const val EXTRA_CHARACTER_ID = "characterId"
    private const val EXTRA_SCALE = "scale"
    private const val EXTRA_AUTO_MOVE = "autoMoveEnabled"
    private const val EXTRA_HOME_HANDOFF = "homeHandoffActive"
    private const val EXTRA_GOALS_JSON = "goalsJson"
    private const val EXTRA_GOAL_SPEECH = "goalSpeechEnabled"
    private const val EXTRA_COMPLETIONS_JSON = "completionsJson"
    private const val EXTRA_LIFESTYLE_JSON = "lifestyleJson"
    private const val EXTRA_QUIET_ENABLED = "quietEnabled"
    private const val EXTRA_QUIET_START_MINUTE = "quietStartMinute"
    private const val EXTRA_QUIET_END_MINUTE = "quietEndMinute"
    private const val EXTRA_QUIET_STOP_AUTO_MOVE = "quietStopAutoMove"
    private const val EXTRA_QUIET_UNTIL_AT = "quietUntilAt"

    private const val PREFS = "root_floating_character_v1"
    private const val PREF_CHARACTER_ID = "characterId"
    private const val PREF_USER_ENABLED = "userEnabled"
    private const val PREF_X = "x"
    private const val PREF_Y = "y"
    private const val PREF_DISPLAY_WIDTH_PX = "displayWidthPx"
    private const val PREF_DISPLAY_HEIGHT_PX = "displayHeightPx"
    private const val PREF_SCALE = "scale"
    private const val PREF_AUTO_MOVE = "autoMoveEnabled"
    private const val PREF_GOALS_JSON = "goalSnapshotJson"
    private const val PREF_GOAL_SPEECH = "goalSpeechEnabled"
    private const val PREF_LAST_GOAL_ID = "lastSpokenGoalId"
    private const val PREF_LAST_GOAL_AT = "lastSpokenGoalAt"
    private const val PREF_COMPLETIONS_JSON = "goalCompletionSnapshotJson"
    private const val PREF_COMPLETION_BASELINE_READY = "goalCompletionBaselineReady"
    private const val PREF_CELEBRATED_COMPLETION_KEYS = "celebratedGoalCompletionKeys"
    private const val PREF_LIFESTYLE_CONTEXT_JSON = "lifestyleContextJson"
    private const val PREF_LIFESTYLE_BASELINE_READY = "lifestyleBaselineReady"
    private const val PREF_LIFESTYLE_REACTION_KEYS = "lifestyleReactionKeys"
    private const val PREF_LAST_LIFESTYLE_REACTION_AT = "lastLifestyleReactionAt"
    private const val PREF_TIME_STATE_SPEECH_KEYS = "timeStateSpeechKeys"
    private const val PREF_QUIET_SCHEDULE_ENABLED = "quietScheduleEnabled"
    private const val PREF_QUIET_START_MINUTE = "quietStartMinute"
    private const val PREF_QUIET_END_MINUTE = "quietEndMinute"
    private const val PREF_QUIET_STOP_AUTO_MOVE = "quietStopAutoMove"
    private const val PREF_QUIET_UNTIL_AT = "quietUntilAt"

    private const val CHANNEL_ID = "root_floating_character"
    private const val NOTIFICATION_ID = 7101

    private const val IDLE_FRAME_DURATION_MS = 700L
    private const val WALK_FRAME_DURATION_MS = 220L
    private const val AUTO_MOVE_TICK_MS = 80L
    private const val AUTO_MOVE_PAUSE_MIN_MS = 2000L
    private const val AUTO_MOVE_PAUSE_MAX_MS = 5000L
    private const val AUTO_MOVE_RESUME_AFTER_TOUCH_MS = 4000L
    private const val AUTO_MOVE_STEP_DP = 2
    private const val AUTO_MOVE_TARGET_RADIUS_DP = 130

    private const val AUTO_MOVE_EDGE_INSET_DP = 18
    private const val AUTO_MOVE_TOP_SAFE_DP = 72
    private const val AUTO_MOVE_BOTTOM_SAFE_DP = 28
    private const val AUTO_MOVE_KEYBOARD_GAP_DP = 18
    private const val KEYBOARD_VISIBLE_MIN_DP = 140
    private const val AUTO_MOVE_EDGE_PERCH_CHANCE_PERCENT = 22
    private const val AUTO_MOVE_LOWER_BAND_CHANCE_PERCENT = 36
    private const val AUTO_MOVE_TARGET_ATTEMPTS = 12
    private const val DISPLAY_RECONCILE_DELAY_MS = 140L
    private const val SCREEN_RESUME_DELAY_MS = 220L
    private const val USER_REJECT_DRAG_DISTANCE_DP = 52
    private const val USER_AVOID_RADIUS_DP = 110
    private const val USER_AVOID_MEMORY_MS = 480000L
    private const val USER_AVOID_ZONE_LIMIT = 3

    private const val LONG_PRESS_MS = 650L
    private const val TAP_REACTION_DISPLAY_MS = 2600L
    private const val ACTION_MENU_DISPLAY_MS = 7000L
    private const val GOAL_SPEECH_DISPLAY_MS = 5200L
    private const val GOAL_SPEECH_FIRST_MIN_MS = 120000L
    private const val GOAL_SPEECH_FIRST_MAX_MS = 300000L
    private const val GOAL_SPEECH_MIN_INTERVAL_MS = 600000L
    private const val GOAL_SPEECH_MAX_INTERVAL_MS = 1200000L
    private const val GOAL_SPEECH_BUSY_RETRY_MS = 15000L
    private const val SAME_GOAL_COOLDOWN_MS = 1800000L

    private const val HAPPY_FRAME_DURATION_MS = 180L
    private const val SIT_FRAME_DURATION_MS = 360L
    private const val SLEEP_FRAME_DURATION_MS = 520L
    private const val TOUCH_FRAME_DURATION_MS = 220L
    private const val BEHAVIOR_STATE_CHECK_MS = 400L
    private const val NATURAL_SIT_AFTER_MS = 2200L
    private const val NATURAL_SLEEP_AFTER_MS = 4200L
    private const val NATURAL_SLEEP_HOLD_MS = 5000L
    private const val COMPLETION_SPEECH_DISPLAY_MS = 5000L
    private const val COMPLETION_QUEUE_GAP_MS = 450L
    private const val COMPLETION_BUSY_RETRY_MS = 500L

    private const val LIFESTYLE_REACTION_DISPLAY_MS = 5200L
    private const val LIFESTYLE_REACTION_MIN_GAP_MS = 1200000L
    private const val LIFESTYLE_REACTION_BUSY_RETRY_MS = 15000L

    private const val QUIET_CHECK_INTERVAL_MS = 60000L
    private const val DEFAULT_QUIET_START_MINUTE = 23 * 60
    private const val DEFAULT_QUIET_END_MINUTE = 7 * 60
    private const val MAX_QUIET_DURATION_MS = 86400000L

    private const val BASE_WIDTH_DP = 118
    private const val BASE_HEIGHT_DP = 176
    private const val MIN_SCALE = 0.60f
    private const val MAX_SCALE = 1.60f
    private const val DEFAULT_SCALE = 1.00f

    @Volatile
    var isRunning: Boolean = false
      private set

    // CHARACTER_V101O_ACTIVE_SERVICE_INSTANCE
    @Volatile
    private var activeInstance: RootFloatingCharacterService? = null

    private fun sanitizeCharacterId(characterId: String): String =
      when (characterId) {
        "rooty",
        "moru",
        "mongsil",
        "dami",
        "pio",
        "nuri",
        "tori" -> characterId
        else -> "rooty"
      }

    private fun prefs(context: Context) =
      context.getSharedPreferences(
        PREFS,
        Context.MODE_PRIVATE
      )

    fun readSelectedCharacter(context: Context): String =
      prefs(context)
        .getString(
          PREF_CHARACTER_ID,
          "rooty"
        )
        ?: "rooty"

    fun readScale(context: Context): Float =
      prefs(context)
        .getFloat(
          PREF_SCALE,
          DEFAULT_SCALE
        )
        .coerceIn(
          MIN_SCALE,
          MAX_SCALE
        )

    fun readAutoMoveEnabled(context: Context): Boolean =
      prefs(context)
        .getBoolean(
          PREF_AUTO_MOVE,
          true
        )

    fun readGoalSpeechEnabled(context: Context): Boolean =
      prefs(context)
        .getBoolean(
          PREF_GOAL_SPEECH,
          true
        )

    fun readPendingGoalCount(context: Context): Int =
      parseGoalSnapshot(
        prefs(context)
          .getString(
            PREF_GOALS_JSON,
            "[]"
          )
          ?: "[]"
      ).size


    // CHARACTER_V101I_QUIET_PERSISTED_CONFIG
    fun readQuietScheduleEnabled(
      context: Context
    ): Boolean =
      prefs(
        context
      )
        .getBoolean(
          PREF_QUIET_SCHEDULE_ENABLED,
          true
        )

    fun readQuietStartMinute(
      context: Context
    ): Int =
      prefs(
        context
      )
        .getInt(
          PREF_QUIET_START_MINUTE,
          DEFAULT_QUIET_START_MINUTE
        )
        .coerceIn(
          0,
          1439
        )

    fun readQuietEndMinute(
      context: Context
    ): Int =
      prefs(
        context
      )
        .getInt(
          PREF_QUIET_END_MINUTE,
          DEFAULT_QUIET_END_MINUTE
        )
        .coerceIn(
          0,
          1439
        )

    fun readQuietStopAutoMove(
      context: Context
    ): Boolean =
      prefs(
        context
      )
        .getBoolean(
          PREF_QUIET_STOP_AUTO_MOVE,
          true
        )

    fun readQuietUntilAt(
      context: Context
    ): Long =
      prefs(
        context
      )
        .getLong(
          PREF_QUIET_UNTIL_AT,
          0L
        )

    private fun minuteOfDayNow():
      Int {
      val calendar =
        java.util.Calendar
          .getInstance()

      return (
        calendar.get(
          java.util.Calendar.HOUR_OF_DAY
        ) *
          60 +
        calendar.get(
          java.util.Calendar.MINUTE
        )
      )
    }

    private fun minuteInsideRange(
      minute: Int,
      startMinute: Int,
      endMinute: Int
    ): Boolean =
      if (
        startMinute ==
          endMinute
      ) {
        false
      }
      else if (
        startMinute <
          endMinute
      ) {
        minute in
          startMinute until
            endMinute
      }
      else {
        minute >=
          startMinute ||
        minute <
          endMinute
      }

    fun isScheduledQuietNow(
      context: Context
    ): Boolean =
      readQuietScheduleEnabled(
        context
      ) &&
      minuteInsideRange(
        minuteOfDayNow(),
        readQuietStartMinute(
          context
        ),
        readQuietEndMinute(
          context
        )
      )

    fun isTemporaryQuietNow(
      context: Context
    ): Boolean =
      readQuietUntilAt(
        context
      ) >
        System.currentTimeMillis()

    fun isQuietActiveNow(
      context: Context
    ): Boolean =
      isScheduledQuietNow(
        context
      ) ||
      isTemporaryQuietNow(
        context
      )

    fun setQuietSchedule(
      context: Context,
      enabled: Boolean,
      startMinute: Int,
      endMinute: Int,
      stopAutoMove: Boolean
    ): Boolean {
      val safeStart =
        startMinute.coerceIn(
          0,
          1439
        )

      val safeEnd =
        endMinute.coerceIn(
          0,
          1439
        )

      prefs(
        context
      )
        .edit()
        .putBoolean(
          PREF_QUIET_SCHEDULE_ENABLED,
          enabled
        )
        .putInt(
          PREF_QUIET_START_MINUTE,
          safeStart
        )
        .putInt(
          PREF_QUIET_END_MINUTE,
          safeEnd
        )
        .putBoolean(
          PREF_QUIET_STOP_AUTO_MOVE,
          stopAutoMove
        )
        .apply()

      if (isRunning) {
        context.startService(
          Intent(
            context,
            RootFloatingCharacterService::class.java
          ).apply {
            action =
              ACTION_SET_QUIET_SCHEDULE
            putExtra(
              EXTRA_QUIET_ENABLED,
              enabled
            )
            putExtra(
              EXTRA_QUIET_START_MINUTE,
              safeStart
            )
            putExtra(
              EXTRA_QUIET_END_MINUTE,
              safeEnd
            )
            putExtra(
              EXTRA_QUIET_STOP_AUTO_MOVE,
              stopAutoMove
            )
          }
        )
      }

      return enabled
    }

    fun setQuietUntil(
      context: Context,
      requestedUntilAt: Long
    ): Long {
      val now =
        System.currentTimeMillis()

      val safeUntil =
        when {
          requestedUntilAt <=
            now ->
            0L
          requestedUntilAt -
            now >
            MAX_QUIET_DURATION_MS ->
            now +
              MAX_QUIET_DURATION_MS
          else ->
            requestedUntilAt
        }

      prefs(
        context
      )
        .edit()
        .putLong(
          PREF_QUIET_UNTIL_AT,
          safeUntil
        )
        .apply()

      if (isRunning) {
        context.startService(
          Intent(
            context,
            RootFloatingCharacterService::class.java
          ).apply {
            action =
              ACTION_SET_QUIET_UNTIL
            putExtra(
              EXTRA_QUIET_UNTIL_AT,
              safeUntil
            )
          }
        )
      }

      return safeUntil
    }

    private fun parseGoalSnapshot(
      goalsJson: String
    ): List<Pair<String, String>> {
      val result =
        mutableListOf<
          Pair<String, String>
        >()

      try {
        val array =
          JSONArray(
            goalsJson
          )

        for (
          index in
          0 until
          array.length()
        ) {
          val item =
            array.optJSONObject(
              index
            )
              ?: continue

          val id =
            item
              .optString(
                "id"
              )
              .trim()
              .take(
                80
              )

          val title =
            item
              .optString(
                "title"
              )
              .trim()
              .take(
                60
              )

          if (
            id.isNotEmpty() &&
            title.isNotEmpty()
          ) {
            result.add(
              Pair(
                id,
                title
              )
            )
          }
        }
      }
      catch (
        ignored: Throwable
      ) {
      }

      return result
    }

    private fun sanitizedGoalSnapshotJson(
      goalsJson: String
    ): String {
      val array =
        JSONArray()

      parseGoalSnapshot(
        goalsJson
      )
        .take(
          8
        )
        .forEach {
          goal ->
          array.put(
            JSONObject().apply {
              put(
                "id",
                goal.first
              )
              put(
                "title",
                goal.second
              )
            }
          )
        }

      return array.toString()
    }


    private fun parseGoalCompletionSnapshot(
      completionsJson: String
    ): List<GoalCompletion> {
      val result =
        mutableListOf<
          GoalCompletion
        >()

      try {
        val array =
          JSONArray(
            completionsJson
          )

        for (
          index in
          0 until
          array.length()
        ) {
          val item =
            array.optJSONObject(
              index
            )
              ?: continue

          val id =
            item
              .optString(
                "id"
              )
              .trim()
              .take(
                80
              )

          val title =
            item
              .optString(
                "title"
              )
              .trim()
              .take(
                60
              )

          val dateKey =
            item
              .optString(
                "dateKey"
              )
              .trim()
              .take(
                10
              )

          if (
            id.isNotEmpty() &&
            title.isNotEmpty() &&
            dateKey.matches(
              Regex(
                "\\d{4}-\\d{2}-\\d{2}"
              )
            )
          ) {
            result.add(
              GoalCompletion(
                id =
                  id,
                title =
                  title,
                dateKey =
                  dateKey
              )
            )
          }
        }
      }
      catch (
        ignored: Throwable
      ) {
      }

      return result
        .distinctBy {
          completion ->
          completion.key
        }
        .take(
          20
        )
    }

    private fun sanitizedGoalCompletionSnapshotJson(
      completionsJson: String
    ): String {
      val array =
        JSONArray()

      parseGoalCompletionSnapshot(
        completionsJson
      )
        .forEach {
          completion ->
          array.put(
            JSONObject().apply {
              put(
                "id",
                completion.id
              )
              put(
                "title",
                completion.title
              )
              put(
                "dateKey",
                completion.dateKey
              )
            }
          )
        }

      return array.toString()
    }

    private fun markCompletionSnapshotSilently(
      context: Context,
      completionsJson: String
    ) {
      val completions =
        parseGoalCompletionSnapshot(
          completionsJson
        )

      val celebrated =
        (
          prefs(
            context
          )
            .getStringSet(
              PREF_CELEBRATED_COMPLETION_KEYS,
              emptySet()
            )
            ?: emptySet()
        )
          .toMutableSet()

      completions.forEach {
        completion ->
        celebrated.add(
          completion.key
        )
      }

      prefs(
        context
      )
        .edit()
        .putBoolean(
          PREF_COMPLETION_BASELINE_READY,
          true
        )
        .putStringSet(
          PREF_CELEBRATED_COMPLETION_KEYS,
          celebrated
        )
        .apply()
    }

    // CHARACTER_V101M_PERSISTED_USER_ENABLE_STATE
    fun readUserEnabled(
      context: Context
    ): Boolean =
      prefs(context)
        .getBoolean(
          PREF_USER_ENABLED,
          false
        )

    fun restoreAfterSystemEvent(
      context: Context
    ): Boolean {
      if (!readUserEnabled(context)) {
        return false
      }

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
        return false
      }

      start(
        context,
        readSelectedCharacter(
          context
        )
      )

      return true
    }

    fun start(
      context: Context,
      characterId: String
    ) {
      val safeId =
        sanitizeCharacterId(
          characterId
        )

      prefs(context)
        .edit()
        .putString(
          PREF_CHARACTER_ID,
          safeId
        )
        .putBoolean(
          PREF_USER_ENABLED,
          true
        )
        .apply()

      val intent =
        Intent(
          context,
          RootFloatingCharacterService::class.java
        ).apply {
          action = ACTION_START
          putExtra(
            EXTRA_CHARACTER_ID,
            safeId
          )
        }

      if (
        Build.VERSION.SDK_INT >=
        Build.VERSION_CODES.O
      ) {
        context.startForegroundService(
          intent
        )
      }
      else {
        context.startService(
          intent
        )
      }
    }

    fun stop(context: Context) {
      prefs(context)
        .edit()
        .putBoolean(
          PREF_USER_ENABLED,
          false
        )
        .apply()

      context.startService(
        Intent(
          context,
          RootFloatingCharacterService::class.java
        ).apply {
          action = ACTION_STOP
        }
      )
    }

    fun updateCharacter(
      context: Context,
      characterId: String
    ) {
      val safeId =
        sanitizeCharacterId(
          characterId
        )

      prefs(context)
        .edit()
        .putString(
          PREF_CHARACTER_ID,
          safeId
        )
        .apply()

      if (!isRunning) {
        return
      }

      context.startService(
        Intent(
          context,
          RootFloatingCharacterService::class.java
        ).apply {
          action = ACTION_UPDATE
          putExtra(
            EXTRA_CHARACTER_ID,
            safeId
          )
        }
      )
    }

    fun setScale(
      context: Context,
      scale: Float
    ): Float {
      val safeScale =
        scale.coerceIn(
          MIN_SCALE,
          MAX_SCALE
        )

      prefs(context)
        .edit()
        .putFloat(
          PREF_SCALE,
          safeScale
        )
        .apply()

      if (isRunning) {
        context.startService(
          Intent(
            context,
            RootFloatingCharacterService::class.java
          ).apply {
            action = ACTION_SET_SCALE
            putExtra(
              EXTRA_SCALE,
              safeScale
            )
          }
        )
      }

      return safeScale
    }

    fun setAutoMoveEnabled(
      context: Context,
      enabled: Boolean
    ): Boolean {
      prefs(context)
        .edit()
        .putBoolean(
          PREF_AUTO_MOVE,
          enabled
        )
        .apply()

      if (isRunning) {
        context.startService(
          Intent(
            context,
            RootFloatingCharacterService::class.java
          ).apply {
            action = ACTION_SET_AUTO_MOVE
            putExtra(
              EXTRA_AUTO_MOVE,
              enabled
            )
          }
        )
      }

      return enabled
    }

    // CHARACTER_V101N_HOME_HANDOFF_CONTROL
    fun setHomeHandoffActive(
      context: Context,
      active: Boolean
    ): Boolean {
      if (!readUserEnabled(context)) {
        return false
      }

      if (!isRunning) {
        if (!active) {
          start(
            context,
            readSelectedCharacter(
              context
            )
          )
        }

        return true
      }

      context.startService(
        Intent(
          context,
          RootFloatingCharacterService::class.java
        ).apply {
          action =
            ACTION_SET_HOME_HANDOFF
          putExtra(
            EXTRA_HOME_HANDOFF,
            active
          )
        }
      )

      return true
    }

    // CHARACTER_V101O_RUNTIME_HEALTH_API
    fun readRuntimeHealth(
      context: Context
    ): Map<String, Any?> {
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

      val instance =
        activeInstance

      if (instance != null) {
        return instance.runtimeHealthSnapshot(
          context,
          permissionGranted
        )
      }

      val stored =
        prefs(context)
      val density =
        context.resources.displayMetrics.density
      val defaultX =
        (18f * density).toInt()
      val defaultY =
        (180f * density).toInt()
      val userEnabled =
        readUserEnabled(context)
      val displayWidth =
        stored.getInt(
          PREF_DISPLAY_WIDTH_PX,
          context.resources.displayMetrics.widthPixels.coerceAtLeast(1)
        )
      val displayHeight =
        stored.getInt(
          PREF_DISPLAY_HEIGHT_PX,
          context.resources.displayMetrics.heightPixels.coerceAtLeast(1)
        )
      val runtimeState =
        when {
          !userEnabled -> "off"
          !permissionGranted -> "permission_missing"
          isRunning -> "instance_missing"
          else -> "stopped"
        }

      return mapOf(
        "userEnabled" to userEnabled,
        "permissionGranted" to permissionGranted,
        "serviceRunning" to isRunning,
        "instanceReady" to false,
        "overlayAttached" to false,
        "homeHandoffActive" to false,
        "screenInteractive" to (
          (
            context.getSystemService(
              Context.POWER_SERVICE
            ) as PowerManager
          ).let {
            manager ->
            if (
              Build.VERSION.SDK_INT >=
              Build.VERSION_CODES.KITKAT_WATCH
            ) {
              manager.isInteractive
            }
            else {
              @Suppress(
                "DEPRECATION"
              )
              manager.isScreenOn
            }
          }
        ),
        "runtimeState" to runtimeState,
        "behaviorMode" to "stopped",
        "characterId" to readSelectedCharacter(
          context
        ),
        "x" to stored.getInt(
          PREF_X,
          defaultX
        ),
        "y" to stored.getInt(
          PREF_Y,
          defaultY
        ),
        "displayWidthPx" to displayWidth,
        "displayHeightPx" to displayHeight,
        "positionSaved" to (
          stored.contains(PREF_X) &&
          stored.contains(PREF_Y)
        ),
        "scale" to readScale(
          context
        ).toDouble(),
        "autoMoveEnabled" to readAutoMoveEnabled(
          context
        )
      )
    }

    fun repairRuntime(
      context: Context
    ): String {
      if (!readUserEnabled(context)) {
        return "disabled"
      }

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
        return "permission_missing"
      }

      val instance =
        activeInstance

      if (
        instance != null &&
        instance.homeHandoffActive
      ) {
        return "home_owned"
      }

      if (!isRunning) {
        start(
          context,
          readSelectedCharacter(
            context
          )
        )
        return "service_start_requested"
      }

      context.startService(
        Intent(
          context,
          RootFloatingCharacterService::class.java
        ).apply {
          action = ACTION_REPAIR_RUNTIME
        }
      )

      return "repair_requested"
    }

    fun resetOverlayPosition(
      context: Context
    ): Boolean {
      prefs(context)
        .edit()
        .remove(PREF_X)
        .remove(PREF_Y)
        .remove(PREF_DISPLAY_WIDTH_PX)
        .remove(PREF_DISPLAY_HEIGHT_PX)
        .apply()

      if (isRunning) {
        context.startService(
          Intent(
            context,
            RootFloatingCharacterService::class.java
          ).apply {
            action = ACTION_RESET_POSITION
          }
        )
      }

      return true
    }

    fun setGoalSnapshot(
      context: Context,
      goalsJson: String
    ): Int {
      val safeJson =
        sanitizedGoalSnapshotJson(
          goalsJson
        )

      prefs(context)
        .edit()
        .putString(
          PREF_GOALS_JSON,
          safeJson
        )
        .apply()

      if (isRunning) {
        context.startService(
          Intent(
            context,
            RootFloatingCharacterService::class.java
          ).apply {
            action =
              ACTION_SET_GOAL_SNAPSHOT
            putExtra(
              EXTRA_GOALS_JSON,
              safeJson
            )
          }
        )
      }

      return parseGoalSnapshot(
        safeJson
      ).size
    }

    fun setGoalCompletionSnapshot(
      context: Context,
      completionsJson: String
    ): Int {
      val safeJson =
        sanitizedGoalCompletionSnapshotJson(
          completionsJson
        )

      prefs(
        context
      )
        .edit()
        .putString(
          PREF_COMPLETIONS_JSON,
          safeJson
        )
        .apply()

      if (isRunning) {
        context.startService(
          Intent(
            context,
            RootFloatingCharacterService::class.java
          ).apply {
            action =
              ACTION_SET_GOAL_COMPLETION_SNAPSHOT
            putExtra(
              EXTRA_COMPLETIONS_JSON,
              safeJson
            )
          }
        )
      }
      else {
        markCompletionSnapshotSilently(
          context,
          safeJson
        )
      }

      return parseGoalCompletionSnapshot(
        safeJson
      ).size
    }

    // CHARACTER_V101G_LIFESTYLE_JSON_CONTRACT
    private fun sanitizeLifestyleContextJson(
      contextJson: String
    ): String {
      val source =
        try {
          JSONObject(
            contextJson
          )
        }
        catch (
          ignored: Throwable
        ) {
          JSONObject()
        }

      val result =
        JSONObject()

      val dateKey =
        source
          .optString(
            "dateKey"
          )
          .trim()
          .take(
            10
          )

      if (
        dateKey.matches(
          Regex(
            "\\d{4}-\\d{2}-\\d{2}"
          )
        )
      ) {
        result.put(
          "dateKey",
          dateKey
        )
      }

      fun copyCount(
        key: String
      ) {
        if (!source.has(key)) {
          return
        }

        result.put(
          key,
          source
            .optInt(
              key,
              0
            )
            .coerceIn(
              0,
              999
            )
        )
      }

      fun copyMoney(
        key: String
      ) {
        if (!source.has(key)) {
          return
        }

        result.put(
          key,
          source
            .optDouble(
              key,
              0.0
            )
            .coerceIn(
              0.0,
              1000000000000.0
            )
        )
      }

      fun copyStateValue(
        key: String
      ) {
        if (!source.has(key)) {
          return
        }

        result.put(
          key,
          source
            .optDouble(
              key,
              50.0
            )
            .coerceIn(
              0.0,
              100.0
            )
        )
      }

      copyCount(
        "pendingGoalCount"
      )
      copyCount(
        "completedGoalCount"
      )
      copyCount(
        "dueGoalCount"
      )

      copyMoney(
        "todayExpense"
      )
      copyMoney(
        "dailyBudget"
      )
      copyMoney(
        "monthExpense"
      )
      copyMoney(
        "monthBudget"
      )

      copyStateValue(
        "mood"
      )
      copyStateValue(
        "energy"
      )
      copyStateValue(
        "affection"
      )

      return result.toString()
    }

    private fun mergeLifestyleContextJson(
      existingJson: String,
      incomingJson: String
    ): String {
      val existing =
        try {
          JSONObject(
            existingJson
          )
        }
        catch (
          ignored: Throwable
        ) {
          JSONObject()
        }

      val incoming =
        try {
          JSONObject(
            sanitizeLifestyleContextJson(
              incomingJson
            )
          )
        }
        catch (
          ignored: Throwable
        ) {
          JSONObject()
        }

      val existingDate =
        existing
          .optString(
            "dateKey"
          )
          .trim()

      val incomingDate =
        incoming
          .optString(
            "dateKey"
          )
          .trim()

      val merged =
        if (
          incomingDate.isNotEmpty() &&
          existingDate.isNotEmpty() &&
          incomingDate !=
            existingDate
        ) {
          JSONObject()
        }
        else {
          JSONObject(
            existing.toString()
          )
        }

      val keys =
        incoming.keys()

      while (
        keys.hasNext()
      ) {
        val key =
          keys.next()

        merged.put(
          key,
          incoming.get(
            key
          )
        )
      }

      return merged.toString()
    }

    fun setLifestyleContextSnapshot(
      context: Context,
      contextJson: String
    ): Boolean {
      val sharedPrefs =
        prefs(
          context
        )

      val currentJson =
        sharedPrefs
          .getString(
            PREF_LIFESTYLE_CONTEXT_JSON,
            "{}"
          )
          ?: "{}"

      val mergedJson =
        mergeLifestyleContextJson(
          currentJson,
          contextJson
        )

      if (isRunning) {
        context.startService(
          Intent(
            context,
            RootFloatingCharacterService::class.java
          ).apply {
            action =
              ACTION_SET_LIFESTYLE_CONTEXT
            putExtra(
              EXTRA_LIFESTYLE_JSON,
              contextJson
            )
          }
        )
      }
      else {
        sharedPrefs
          .edit()
          .putString(
            PREF_LIFESTYLE_CONTEXT_JSON,
            mergedJson
          )
          .putBoolean(
            PREF_LIFESTYLE_BASELINE_READY,
            true
          )
          .apply()
      }

      return true
    }

    fun setGoalSpeechEnabled(
      context: Context,
      enabled: Boolean
    ): Boolean {
      prefs(context)
        .edit()
        .putBoolean(
          PREF_GOAL_SPEECH,
          enabled
        )
        .apply()

      if (isRunning) {
        context.startService(
          Intent(
            context,
            RootFloatingCharacterService::class.java
          ).apply {
            action =
              ACTION_SET_GOAL_SPEECH
            putExtra(
              EXTRA_GOAL_SPEECH,
              enabled
            )
          }
        )
      }

      return enabled
    }

    fun showGoalSpeechNow(
      context: Context
    ): Boolean {
      if (!isRunning) {
        return false
      }

      context.startService(
        Intent(
          context,
          RootFloatingCharacterService::class.java
        ).apply {
          action =
            ACTION_SHOW_GOAL_SPEECH_NOW
        }
      )

      return true
    }
  }

  private lateinit var windowManager: WindowManager

  // CHARACTER_V101L_ROTATION_RESOLUTION_RUNTIME
  private val stabilityHandler =
    Handler(
      Looper.getMainLooper()
    )

  private var screenInteractive = true

  // CHARACTER_V101N_HOME_HANDOFF_RUNTIME
  private var homeHandoffActive = false

  private var screenStateReceiverRegistered = false
  private var lastKnownDisplayWidth = 0
  private var lastKnownDisplayHeight = 0

  private val displayReconcileRunnable =
    Runnable {
      reconcileOverlayForCurrentDisplay()
    }

  // CHARACTER_V101L_SCREEN_POWER_RUNTIME
  private val screenStateReceiver =
    object : BroadcastReceiver() {
      override fun onReceive(
        context: Context?,
        intent: Intent?
      ) {
        when (intent?.action) {
          Intent.ACTION_SCREEN_OFF ->
            handleScreenInteractiveChanged(
              false
            )

          Intent.ACTION_SCREEN_ON ->
            handleScreenInteractiveChanged(
              true
            )
        }
      }
    }

  private var overlayView: ImageView? = null
  private var overlayParams: WindowManager.LayoutParams? = null

  // CHARACTER_V101B_NATIVE_IDLE_ANIMATION
  private val animationHandler =
    Handler(
      Looper.getMainLooper()
    )

  private enum class BehaviorAnimationMode {
    IDLE,
    WALK,
    SIT,
    SLEEP,
    HAPPY,
    TOUCH
  }

  // CHARACTER_V101J_BEHAVIOR_STATE_RUNTIME
  private var animatedCharacterId = "rooty"
  private var animationFrameIndex = 0
  private var walkingAnimationActive = false
  private var behaviorAnimationMode =
    BehaviorAnimationMode.IDLE
  private var behaviorFrameIndex = 0
  private var stationarySinceAt =
    SystemClock.uptimeMillis()
  private var naturalSleepStartedAt = 0L
  private var quietSleepForced = false
  private var touchAnimationActive = false
  private var touchAnimationStep = 0
  private val touchFrameSequence =
    intArrayOf(
      0,
      1,
      0
    )

  // CHARACTER_V101F_HAPPY_ANIMATION_RUNTIME
  private var happyAnimationActive = false
  private var happyAnimationStep = 0
  private val happyFrameSequence =
    intArrayOf(
      0,
      1,
      2,
      1,
      2,
      1,
      0
    )

  private val animationRunnable =
    object : Runnable {
      override fun run() {
        if (!screenInteractive) {
          return
        }

        val view =
          overlayView
            ?: return

        if (happyAnimationActive) {
          val happyFrames =
            happyDrawableFramesForCharacter(
              animatedCharacterId
            )

          if (
            happyAnimationStep >=
            happyFrameSequence.size
          ) {
            happyAnimationActive = false
            happyAnimationStep = 0
            walkingAnimationActive = false
            behaviorAnimationMode =
              BehaviorAnimationMode.IDLE
            behaviorFrameIndex = 0
            animationFrameIndex = 0
            stationarySinceAt =
              SystemClock.uptimeMillis()

            val idleFrames =
              drawableFramesForCharacter(
                animatedCharacterId
              )

            view.setImageResource(
              idleFrames[
                0
              ]
            )

            scheduleBehaviorStateCheck()

            animationHandler.postDelayed(
              this,
              IDLE_FRAME_DURATION_MS
            )
            return
          }

          val frameIndex =
            happyFrameSequence[
              happyAnimationStep
            ].coerceIn(
              0,
              happyFrames.size -
                1
            )

          view.setImageResource(
            happyFrames[
              frameIndex
            ]
          )

          happyAnimationStep +=
            1

          animationHandler.postDelayed(
            this,
            HAPPY_FRAME_DURATION_MS
          )
          return
        }

        if (touchAnimationActive) {
          val touchFrames =
            touchDrawableFramesForCharacter(
              animatedCharacterId
            )

          if (
            touchAnimationStep >=
            touchFrameSequence.size
          ) {
            touchAnimationActive = false
            touchAnimationStep = 0
            behaviorAnimationMode =
              BehaviorAnimationMode.IDLE
            behaviorFrameIndex = 0
            animationFrameIndex = 0
            stationarySinceAt =
              SystemClock.uptimeMillis()

            val idleFrames =
              drawableFramesForCharacter(
                animatedCharacterId
              )

            view.setImageResource(
              idleFrames[
                0
              ]
            )

            scheduleBehaviorStateCheck()

            animationHandler.postDelayed(
              this,
              IDLE_FRAME_DURATION_MS
            )
            return
          }

          val frameIndex =
            touchFrameSequence[
              touchAnimationStep
            ].coerceIn(
              0,
              touchFrames.size -
                1
            )

          view.setImageResource(
            touchFrames[
              frameIndex
            ]
          )

          touchAnimationStep +=
            1

          animationHandler.postDelayed(
            this,
            TOUCH_FRAME_DURATION_MS
          )
          return
        }

        if (
          behaviorAnimationMode ==
            BehaviorAnimationMode.SIT
        ) {
          val sitFrames =
            sitDrawableFramesForCharacter(
              animatedCharacterId
            )

          val frameIndex =
            behaviorFrameIndex.coerceIn(
              0,
              sitFrames.size -
                1
            )

          view.setImageResource(
            sitFrames[
              frameIndex
            ]
          )

          if (
            behaviorFrameIndex <
              sitFrames.size -
                1
          ) {
            behaviorFrameIndex +=
              1
          }

          animationHandler.postDelayed(
            this,
            SIT_FRAME_DURATION_MS
          )
          return
        }

        if (
          behaviorAnimationMode ==
            BehaviorAnimationMode.SLEEP
        ) {
          val sleepFrames =
            sleepDrawableFramesForCharacter(
              animatedCharacterId
            )

          val frameIndex =
            if (
              behaviorFrameIndex <
                sleepFrames.size
            ) {
              behaviorFrameIndex
            }
            else {
              val breathingStart =
                (
                  sleepFrames.size -
                    2
                ).coerceAtLeast(
                  0
                )

              breathingStart +
                (
                  (
                    behaviorFrameIndex -
                      sleepFrames.size
                  ) %
                    2
                )
            }
              .coerceIn(
                0,
                sleepFrames.size -
                  1
              )

          view.setImageResource(
            sleepFrames[
              frameIndex
            ]
          )

          behaviorFrameIndex +=
            1

          animationHandler.postDelayed(
            this,
            SLEEP_FRAME_DURATION_MS
          )
          return
        }

        val frames =
          if (walkingAnimationActive) {
            walkDrawableFramesForCharacter(
              animatedCharacterId
            )
          }
          else {
            drawableFramesForCharacter(
              animatedCharacterId
            )
          }

        animationFrameIndex =
          (
            animationFrameIndex +
              1
          ) %
          frames.size

        view.setImageResource(
          frames[
            animationFrameIndex
          ]
        )

        val frameDurationMs =
          if (walkingAnimationActive) {
            WALK_FRAME_DURATION_MS
          }
          else {
            IDLE_FRAME_DURATION_MS
          }

        animationHandler.postDelayed(
          this,
          frameDurationMs
        )
      }
    }

  // CHARACTER_V101J_NATURAL_REST_STATE_MACHINE
  private val behaviorHandler =
    Handler(
      Looper.getMainLooper()
    )

  private val behaviorStateRunnable =
    object : Runnable {
      override fun run() {
        if (!screenInteractive) {
          return
        }

        val now =
          SystemClock.uptimeMillis()

        if (
          overlayView == null ||
          userInteracting ||
          walkingAnimationActive ||
          happyAnimationActive ||
          touchAnimationActive ||
          completionReactionActive ||
          actionMenuView != null
        ) {
          scheduleBehaviorStateCheck()
          return
        }

        if (
          scheduledQuietActive &&
          shouldSuppressAutoMoveForQuiet()
        ) {
          nudgeQuietSleepAboveKeyboardIfNeeded()

          if (
            behaviorAnimationMode !=
              BehaviorAnimationMode.SLEEP ||
            !quietSleepForced
          ) {
            startSleepAnimation(
              forcedByQuiet = true,
              preserveStationaryTime = true
            )
          }

          scheduleBehaviorStateCheck()
          return
        }

        if (quietSleepForced) {
          quietSleepForced = false
          startIdleAnimation(
            animatedCharacterId
          )
          scheduleBehaviorStateCheck()
          return
        }

        val stationaryFor =
          now -
            stationarySinceAt

        when (
          behaviorAnimationMode
        ) {
          BehaviorAnimationMode.IDLE -> {
            if (
              stationaryFor >=
                NATURAL_SIT_AFTER_MS
            ) {
              startSitAnimation(
                preserveStationaryTime = true
              )
            }
          }

          BehaviorAnimationMode.SIT -> {
            if (
              stationaryFor >=
                NATURAL_SLEEP_AFTER_MS
            ) {
              startSleepAnimation(
                forcedByQuiet = false,
                preserveStationaryTime = true
              )
            }
          }

          BehaviorAnimationMode.SLEEP -> {
            if (
              !quietSleepForced &&
              naturalSleepStartedAt >
                0L &&
              now -
                naturalSleepStartedAt >=
                NATURAL_SLEEP_HOLD_MS
            ) {
              startIdleAnimation(
                animatedCharacterId
              )
            }
          }

          else -> {
          }
        }

        scheduleBehaviorStateCheck()
      }
    }

  private fun scheduleBehaviorStateCheck() {
    behaviorHandler.removeCallbacks(
      behaviorStateRunnable
    )

    if (
      !screenInteractive ||
      overlayView == null
    ) {
      return
    }

    behaviorHandler.postDelayed(
      behaviorStateRunnable,
      BEHAVIOR_STATE_CHECK_MS
    )
  }

  // CHARACTER_V101C_AUTONOMOUS_MOTION
  private val motionHandler =
    Handler(
      Looper.getMainLooper()
    )

  private var autoMoveEnabled = true
  private var userInteracting = false
  private var autoMoveResumeAt = 0L
  private var autoMovePauseUntil = 0L
  private var autoTargetX: Int? = null
  private var autoTargetY: Int? = null
  private var currentScale = DEFAULT_SCALE

  private data class UserAvoidZone(
    val centerX: Int,
    val centerY: Int,
    val untilAt: Long
  )

  // CHARACTER_V101K_USER_REJECTED_AREA_MEMORY
  private val userAvoidZones =
    mutableListOf<
      UserAvoidZone
    >()

  private val motionRunnable =
    object : Runnable {
      override fun run() {
        if (!screenInteractive) {
          return
        }

        val view =
          overlayView
            ?: return
        val params =
          overlayParams
            ?: return

        if (
          !autoMoveEnabled ||
          shouldSuppressAutoMoveForQuiet()
        ) {
          setMovementAnimation(
            false
          )
          return
        }

        val now =
          SystemClock.uptimeMillis()

        if (
          userInteracting ||
          actionMenuView != null ||
          now < autoMoveResumeAt
        ) {
          setMovementAnimation(
            false
          )

          motionHandler.postDelayed(
            this,
            AUTO_MOVE_TICK_MS
          )
          return
        }

        val dynamicRetargeted =
          adjustAutoMoveTargetForDynamicAvoidance(
            params
          )

        if (
          !dynamicRetargeted &&
          now < autoMovePauseUntil
        ) {
          setMovementAnimation(
            false
          )

          motionHandler.postDelayed(
            this,
            AUTO_MOVE_TICK_MS
          )
          return
        }

        if (
          autoTargetX == null ||
          autoTargetY == null
        ) {
          chooseAutoMoveTarget(
            params
          )
        }

        val targetX =
          autoTargetX
            ?: params.x
        val targetY =
          autoTargetY
            ?: params.y

        val step =
          dp(
            AUTO_MOVE_STEP_DP
          ).coerceAtLeast(
            1
          )

        setMovementAnimation(
          true
        )

        params.x =
          stepToward(
            params.x,
            targetX,
            step
          )
        params.y =
          stepToward(
            params.y,
            targetY,
            step
          )

        clampOverlayPosition(
          params
        )

        safelyUpdateOverlayLayout(
          view,
          params
        )

        if (
          params.x == targetX &&
          params.y == targetY
        ) {
          setMovementAnimation(
            false
          )

          autoTargetX = null
          autoTargetY = null
          autoMovePauseUntil =
            now +
              Random.nextLong(
                AUTO_MOVE_PAUSE_MIN_MS,
                AUTO_MOVE_PAUSE_MAX_MS + 1
              )

          saveOverlayPosition(
            params
          )
        }

        motionHandler.postDelayed(
          this,
          AUTO_MOVE_TICK_MS
        )
      }
    }

  // CHARACTER_V101I_QUIET_RUNTIME
  private val quietHandler =
    Handler(
      Looper.getMainLooper()
    )

  private var quietActive =
    false

  private var scheduledQuietActive =
    false

  private val quietCheckRunnable =
    object : Runnable {
      override fun run() {
        refreshQuietMode(
          force = false
        )

        quietHandler.postDelayed(
          this,
          QUIET_CHECK_INTERVAL_MS
        )
      }
    }

  // CHARACTER_V101E_GOAL_SPEECH_RUNTIME
  private val speechHandler =
    Handler(
      Looper.getMainLooper()
    )

  private var goalSpeechEnabled = true
  private var pendingGoals =
    emptyList<
      Pair<String, String>
    >()

  private var speechBubbleView: TextView? = null
  private var speechBubbleParams: WindowManager.LayoutParams? = null
  private var actionMenuView: LinearLayout? = null
  private var actionMenuParams: WindowManager.LayoutParams? = null


  // CHARACTER_V101F_GOAL_COMPLETION_RUNTIME
  private val completionQueue =
    mutableListOf<
      GoalCompletion
    >()
  private var completionReactionActive = false

  private val retryCompletionReactionRunnable =
    Runnable {
      playNextGoalCompletionCelebration()
    }

  private val finishCompletionReactionRunnable =
    Runnable {
      completionReactionActive = false

      if (
        completionQueue.isNotEmpty()
      ) {
        speechHandler.postDelayed(
          retryCompletionReactionRunnable,
          COMPLETION_QUEUE_GAP_MS
        )
      }
      else if (
        lifestyleReactionQueue.isNotEmpty()
      ) {
        speechHandler.postDelayed(
          retryLifestyleReactionRunnable,
          450L
        )
      }
      else if (
        goalSpeechEnabled
      ) {
        scheduleNextGoalSpeech(
          initial = false
        )
      }
    }


  // CHARACTER_V101G_LIFESTYLE_REACTION_RUNTIME
  private val lifestyleReactionQueue =
    mutableListOf<
      Pair<
        String,
        String
      >
    >()

  private var lifestyleReactionActive =
    false

  private val retryLifestyleReactionRunnable =
    Runnable {
      playNextLifestyleReaction()
    }

  private val finishLifestyleReactionRunnable =
    Runnable {
      lifestyleReactionActive = false

      if (
        lifestyleReactionQueue.isNotEmpty()
      ) {
        speechHandler.postDelayed(
          retryLifestyleReactionRunnable,
          450L
        )
      }
      else if (
        goalSpeechEnabled
      ) {
        scheduleNextGoalSpeech(
          initial = false
        )
      }
    }

  private val hideSpeechRunnable =
    Runnable {
      hideSpeechBubble()
    }

  private val hideActionMenuRunnable =
    Runnable {
      hideActionMenu()
    }

  private val goalSpeechRunnable =
    object : Runnable {
      override fun run() {
        if (
          !screenInteractive ||
          !goalSpeechEnabled ||
          quietActive ||
          overlayView == null
        ) {
          return
        }

        if (
          userInteracting ||
          walkingAnimationActive ||
          completionReactionActive ||
          completionQueue.isNotEmpty() ||
          lifestyleReactionActive ||
          lifestyleReactionQueue.isNotEmpty() ||
          actionMenuView != null
        ) {
          speechHandler.postDelayed(
            this,
            GOAL_SPEECH_BUSY_RETRY_MS
          )
          return
        }

        showNextGoalSpeech(
          force = false
        )
        scheduleNextGoalSpeech(
          initial = false
        )
      }
    }

  private val prefs by lazy {
    getSharedPreferences(
      PREFS,
      Context.MODE_PRIVATE
    )
  }

  override fun onCreate() {
    super.onCreate()

    activeInstance = this

    windowManager =
      getSystemService(
        WINDOW_SERVICE
      ) as WindowManager

    screenInteractive =
      isScreenInteractiveNow()

    lastKnownDisplayWidth =
      currentDisplayWidth()

    lastKnownDisplayHeight =
      currentDisplayHeight()

    registerScreenStateReceiver()

    currentScale =
      readScale(
        this
      )

    autoMoveEnabled =
      readAutoMoveEnabled(
        this
      )

    goalSpeechEnabled =
      readGoalSpeechEnabled(
        this
      )

    pendingGoals =
      parseGoalSnapshot(
        prefs.getString(
          PREF_GOALS_JSON,
          "[]"
        )
          ?: "[]"
      )

    quietActive =
      isQuietActiveNow(
        this
      )

    scheduledQuietActive =
      isScheduledQuietNow(
        this
      )

    createNotificationChannel()
    promoteToForeground()

    isRunning = true

    quietHandler.removeCallbacks(
      quietCheckRunnable
    )
    quietHandler.post(
      quietCheckRunnable
    )
  }

  override fun onStartCommand(
    intent: Intent?,
    flags: Int,
    startId: Int
  ): Int {
    activeInstance = this

    if (intent == null) {
      restoreAfterStickyServiceRestart()
      return START_STICKY
    }

    scheduleDisplayReconcile()

    when (intent.action) {
      ACTION_STOP -> {
        // V101N also covers notification "hide": explicit OFF must stay OFF.
        prefs
          .edit()
          .putBoolean(
            PREF_USER_ENABLED,
            false
          )
          .apply()

        stopSelf()
        return START_NOT_STICKY
      }

      ACTION_UPDATE -> {
        val characterId =
          intent.getStringExtra(
            EXTRA_CHARACTER_ID
          )
            ?: readSelectedCharacter(
              this
            )

        showOrUpdateOverlay(
          characterId
        )
        return START_STICKY
      }

      ACTION_SET_SCALE -> {
        applyOverlayScale(
          intent.getFloatExtra(
            EXTRA_SCALE,
            readScale(
              this
            )
          ),
          persist = true
        )
        return START_STICKY
      }

      ACTION_SET_AUTO_MOVE -> {
        setAutoMoveEnabledInternal(
          intent.getBooleanExtra(
            EXTRA_AUTO_MOVE,
            readAutoMoveEnabled(
              this
            )
          ),
          persist = true
        )
        return START_STICKY
      }

      ACTION_SET_HOME_HANDOFF -> {
        applyHomeHandoff(
          intent.getBooleanExtra(
            EXTRA_HOME_HANDOFF,
            false
          )
        )
        return START_STICKY
      }

      ACTION_REPAIR_RUNTIME -> {
        repairVisibleRuntime()
        return START_STICKY
      }

      ACTION_RESET_POSITION -> {
        resetOverlayPositionInternal()
        return START_STICKY
      }

      ACTION_SET_GOAL_SNAPSHOT -> {
        applyGoalSnapshotInternal(
          intent.getStringExtra(
            EXTRA_GOALS_JSON
          )
            ?: "[]",
          persist = true
        )
        return START_STICKY
      }

      ACTION_SET_GOAL_COMPLETION_SNAPSHOT -> {
        applyGoalCompletionSnapshotInternal(
          intent.getStringExtra(
            EXTRA_COMPLETIONS_JSON
          )
            ?: "[]",
          persist = true
        )
        return START_STICKY
      }

      ACTION_SET_LIFESTYLE_CONTEXT -> {
        applyLifestyleContextInternal(
          intent.getStringExtra(
            EXTRA_LIFESTYLE_JSON
          )
            ?: "{}"
        )
        return START_STICKY
      }

      ACTION_SET_QUIET_SCHEDULE -> {
        prefs
          .edit()
          .putBoolean(
            PREF_QUIET_SCHEDULE_ENABLED,
            intent.getBooleanExtra(
              EXTRA_QUIET_ENABLED,
              readQuietScheduleEnabled(
                this
              )
            )
          )
          .putInt(
            PREF_QUIET_START_MINUTE,
            intent.getIntExtra(
              EXTRA_QUIET_START_MINUTE,
              readQuietStartMinute(
                this
              )
            ).coerceIn(
              0,
              1439
            )
          )
          .putInt(
            PREF_QUIET_END_MINUTE,
            intent.getIntExtra(
              EXTRA_QUIET_END_MINUTE,
              readQuietEndMinute(
                this
              )
            ).coerceIn(
              0,
              1439
            )
          )
          .putBoolean(
            PREF_QUIET_STOP_AUTO_MOVE,
            intent.getBooleanExtra(
              EXTRA_QUIET_STOP_AUTO_MOVE,
              readQuietStopAutoMove(
                this
              )
            )
          )
          .apply()

        refreshQuietMode(
          force = true
        )

        return START_STICKY
      }

      ACTION_SET_QUIET_UNTIL -> {
        prefs
          .edit()
          .putLong(
            PREF_QUIET_UNTIL_AT,
            intent.getLongExtra(
              EXTRA_QUIET_UNTIL_AT,
              0L
            )
          )
          .apply()

        refreshQuietMode(
          force = true
        )

        return START_STICKY
      }

      ACTION_SET_GOAL_SPEECH -> {
        setGoalSpeechEnabledInternal(
          intent.getBooleanExtra(
            EXTRA_GOAL_SPEECH,
            readGoalSpeechEnabled(
              this
            )
          ),
          persist = true
        )
        return START_STICKY
      }

      ACTION_SHOW_GOAL_SPEECH_NOW -> {
        showNextGoalSpeech(
          force = true
        )
        return START_STICKY
      }

      else -> {
        val characterId =
          intent
            ?.getStringExtra(
              EXTRA_CHARACTER_ID
            )
            ?: readSelectedCharacter(
              this
            )

        showOrUpdateOverlay(
          characterId
        )
        return START_STICKY
      }
    }
  }

  override fun onBind(
    intent: Intent?
  ): IBinder? = null

  override fun onConfigurationChanged(
    newConfig: Configuration
  ) {
    super.onConfigurationChanged(
      newConfig
    )

    // CHARACTER_V101L_ROTATION_RESOLUTION_RECONCILE
    scheduleDisplayReconcile()
  }

  override fun onDestroy() {
    stabilityHandler.removeCallbacksAndMessages(
      null
    )
    unregisterScreenStateReceiver()
    removeOverlay()

    if (activeInstance === this) {
      activeInstance = null
    }

    isRunning = false
    super.onDestroy()
  }

  override fun onTaskRemoved(
    rootIntent: Intent?
  ) {
    // Deliberately do not stop.
    // The foreground service keeps the user-enabled overlay alive
    // after the ROOT Activity is removed from Recents.
    super.onTaskRemoved(
      rootIntent
    )
  }

  // CHARACTER_V101L_SERVICE_RESTART_RECOVERY
  private fun restoreAfterStickyServiceRestart() {
    currentScale =
      readScale(
        this
      )

    autoMoveEnabled =
      readAutoMoveEnabled(
        this
      )

    goalSpeechEnabled =
      readGoalSpeechEnabled(
        this
      )

    pendingGoals =
      parseGoalSnapshot(
        prefs.getString(
          PREF_GOALS_JSON,
          "[]"
        )
          ?: "[]"
      )

    quietActive =
      isQuietActiveNow(
        this
      )

    scheduledQuietActive =
      isScheduledQuietNow(
        this
      )

    screenInteractive =
      isScreenInteractiveNow()

    showOrUpdateOverlay(
      readSelectedCharacter(
        this
      )
    )

    scheduleDisplayReconcile()

    if (screenInteractive) {
      refreshQuietMode(
        force = true
      )
    }
    else {
      suspendVisualRuntimeForScreenOff()
    }
  }

  private fun currentDisplayWidth(): Int =
    resources
      .displayMetrics
      .widthPixels
      .coerceAtLeast(
        1
      )

  private fun currentDisplayHeight(): Int =
    resources
      .displayMetrics
      .heightPixels
      .coerceAtLeast(
        1
      )

  private fun remapDisplayCoordinate(
    value: Int,
    oldMax: Int,
    newMax: Int
  ): Int {
    if (newMax <= 0) {
      return 0
    }

    if (oldMax <= 0) {
      return value.coerceIn(
        0,
        newMax
      )
    }

    val safeValue =
      value.coerceIn(
        0,
        oldMax
      )

    return (
      safeValue.toLong() *
        newMax.toLong() /
        oldMax.toLong()
    )
      .toInt()
      .coerceIn(
        0,
        newMax
      )
  }

  private fun restoreOverlayPositionForCurrentDisplay(
    params: WindowManager.LayoutParams
  ) {
    val width =
      currentDisplayWidth()

    val height =
      currentDisplayHeight()

    val savedWidth =
      prefs
        .getInt(
          PREF_DISPLAY_WIDTH_PX,
          width
        )
        .coerceAtLeast(
          1
        )

    val savedHeight =
      prefs
        .getInt(
          PREF_DISPLAY_HEIGHT_PX,
          height
        )
        .coerceAtLeast(
          1
        )

    val oldMaxX =
      (
        savedWidth -
          params.width
      ).coerceAtLeast(
        0
      )

    val oldMaxY =
      (
        savedHeight -
          params.height
      ).coerceAtLeast(
        0
      )

    val newMaxX =
      (
        width -
          params.width
      ).coerceAtLeast(
        0
      )

    val newMaxY =
      (
        height -
          params.height
      ).coerceAtLeast(
        0
      )

    params.x =
      remapDisplayCoordinate(
        params.x,
        oldMaxX,
        newMaxX
      )

    params.y =
      remapDisplayCoordinate(
        params.y,
        oldMaxY,
        newMaxY
      )

    clampOverlayPosition(
      params
    )

    lastKnownDisplayWidth =
      width
    lastKnownDisplayHeight =
      height

    saveOverlayPosition(
      params
    )
  }

  private fun scheduleDisplayReconcile() {
    stabilityHandler.removeCallbacks(
      displayReconcileRunnable
    )

    stabilityHandler.postDelayed(
      displayReconcileRunnable,
      DISPLAY_RECONCILE_DELAY_MS
    )
  }

  private fun reconcileOverlayForCurrentDisplay() {
    val view =
      overlayView
        ?: run {
          lastKnownDisplayWidth =
            currentDisplayWidth()
          lastKnownDisplayHeight =
            currentDisplayHeight()
          return
        }

    val params =
      overlayParams
        ?: return

    val nextWidth =
      currentDisplayWidth()

    val nextHeight =
      currentDisplayHeight()

    val previousWidth =
      if (
        lastKnownDisplayWidth >
          0
      ) {
        lastKnownDisplayWidth
      }
      else {
        prefs.getInt(
          PREF_DISPLAY_WIDTH_PX,
          nextWidth
        )
      }
        .coerceAtLeast(
          1
        )

    val previousHeight =
      if (
        lastKnownDisplayHeight >
          0
      ) {
        lastKnownDisplayHeight
      }
      else {
        prefs.getInt(
          PREF_DISPLAY_HEIGHT_PX,
          nextHeight
        )
      }
        .coerceAtLeast(
          1
        )

    val oldParamsWidth =
      params.width.coerceAtLeast(
        1
      )

    val oldParamsHeight =
      params.height.coerceAtLeast(
        1
      )

    val oldMaxX =
      (
        previousWidth -
          oldParamsWidth
      ).coerceAtLeast(
        0
      )

    val oldMaxY =
      (
        previousHeight -
          oldParamsHeight
      ).coerceAtLeast(
        0
      )

    params.width =
      scaledWidth(
        currentScale
      )

    params.height =
      scaledHeight(
        currentScale
      )

    val newMaxX =
      (
        nextWidth -
          params.width
      ).coerceAtLeast(
        0
      )

    val newMaxY =
      (
        nextHeight -
          params.height
      ).coerceAtLeast(
        0
      )

    if (
      previousWidth !=
        nextWidth ||
      previousHeight !=
        nextHeight
    ) {
      params.x =
        remapDisplayCoordinate(
          params.x,
          oldMaxX,
          newMaxX
        )

      params.y =
        remapDisplayCoordinate(
          params.y,
          oldMaxY,
          newMaxY
        )
    }

    clampOverlayPosition(
      params
    )

    autoTargetX = null
    autoTargetY = null

    lastKnownDisplayWidth =
      nextWidth
    lastKnownDisplayHeight =
      nextHeight

    safelyUpdateOverlayLayout(
      view,
      params
    )

    saveOverlayPosition(
      params
    )
  }

  private fun isScreenInteractiveNow(): Boolean {
    val powerManager =
      getSystemService(
        POWER_SERVICE
      ) as PowerManager

    return powerManager.isInteractive
  }

  private fun registerScreenStateReceiver() {
    if (screenStateReceiverRegistered) {
      return
    }

    val filter =
      IntentFilter().apply {
        addAction(
          Intent.ACTION_SCREEN_OFF
        )
        addAction(
          Intent.ACTION_SCREEN_ON
        )
      }

    try {
      if (
        Build.VERSION.SDK_INT >=
          Build.VERSION_CODES.TIRAMISU
      ) {
        registerReceiver(
          screenStateReceiver,
          filter,
          Context.RECEIVER_NOT_EXPORTED
        )
      }
      else {
        @Suppress(
          "DEPRECATION"
        )
        registerReceiver(
          screenStateReceiver,
          filter
        )
      }

      screenStateReceiverRegistered =
        true
    }
    catch (
      ignored: Throwable
    ) {
      screenStateReceiverRegistered =
        false
    }
  }

  private fun unregisterScreenStateReceiver() {
    if (!screenStateReceiverRegistered) {
      return
    }

    try {
      unregisterReceiver(
        screenStateReceiver
      )
    }
    catch (
      ignored: Throwable
    ) {
    }

    screenStateReceiverRegistered =
      false
  }

  // CHARACTER_V101L_BATTERY_SCREEN_OFF_SUSPEND
  private fun suspendVisualRuntimeForScreenOff() {
    animationHandler.removeCallbacks(
      animationRunnable
    )
    behaviorHandler.removeCallbacks(
      behaviorStateRunnable
    )
    motionHandler.removeCallbacks(
      motionRunnable
    )
    speechHandler.removeCallbacks(
      goalSpeechRunnable
    )
    speechHandler.removeCallbacks(
      retryCompletionReactionRunnable
    )
    speechHandler.removeCallbacks(
      finishCompletionReactionRunnable
    )
    speechHandler.removeCallbacks(
      retryLifestyleReactionRunnable
    )
    speechHandler.removeCallbacks(
      finishLifestyleReactionRunnable
    )

    walkingAnimationActive = false
    happyAnimationActive = false
    happyAnimationStep = 0
    touchAnimationActive = false
    touchAnimationStep = 0
    completionReactionActive = false
    lifestyleReactionActive = false
    autoTargetX = null
    autoTargetY = null

    hideSpeechBubble()
    hideActionMenu()
  }

  private fun handleScreenInteractiveChanged(
    interactive: Boolean
  ) {
    if (
      screenInteractive ==
        interactive
    ) {
      return
    }

    screenInteractive =
      interactive

    if (!interactive) {
      suspendVisualRuntimeForScreenOff()
      return
    }

    scheduleDisplayReconcile()

    refreshQuietMode(
      force = true
    )

    if (
      !quietActive &&
      !quietSleepForced
    ) {
      startIdleAnimation(
        animatedCharacterId
      )
    }

    if (
      autoMoveEnabled &&
      !shouldSuppressAutoMoveForQuiet()
    ) {
      autoMoveResumeAt =
        SystemClock.uptimeMillis() +
          SCREEN_RESUME_DELAY_MS

      startAutoMoveLoop(
        SCREEN_RESUME_DELAY_MS
      )
    }

    scheduleBehaviorStateCheck()

    stabilityHandler.postDelayed(
      {
        if (
          screenInteractive &&
          !quietActive
        ) {
          if (
            completionQueue.isNotEmpty()
          ) {
            playNextGoalCompletionCelebration()
          }
          else if (
            lifestyleReactionQueue.isNotEmpty()
          ) {
            playNextLifestyleReaction()
          }
          else if (goalSpeechEnabled) {
            scheduleNextGoalSpeech(
              initial = true
            )
          }
        }
      },
      SCREEN_RESUME_DELAY_MS
    )
  }

  // CHARACTER_V101O_RUNTIME_HEALTH_SNAPSHOT
  private fun runtimeHealthSnapshot(
    context: Context,
    permissionGranted: Boolean
  ): Map<String, Any?> {
    val attached =
      overlayView != null &&
      overlayParams != null
    val userEnabled =
      readUserEnabled(context)
    val currentParams =
      overlayParams
    val defaultX =
      dp(18)
    val defaultY =
      dp(180)
    val runtimeState =
      when {
        !userEnabled -> "off"
        !permissionGranted -> "permission_missing"
        homeHandoffActive -> "home_owned"
        !screenInteractive -> "screen_off"
        attached -> "visible"
        else -> "overlay_missing"
      }

    return mapOf(
      "userEnabled" to userEnabled,
      "permissionGranted" to permissionGranted,
      "serviceRunning" to isRunning,
      "instanceReady" to true,
      "overlayAttached" to attached,
      "homeHandoffActive" to homeHandoffActive,
      "screenInteractive" to screenInteractive,
      "runtimeState" to runtimeState,
      "behaviorMode" to behaviorAnimationMode.name.lowercase(),
      "characterId" to animatedCharacterId,
      "x" to (
        currentParams?.x ?:
        prefs.getInt(
          PREF_X,
          defaultX
        )
      ),
      "y" to (
        currentParams?.y ?:
        prefs.getInt(
          PREF_Y,
          defaultY
        )
      ),
      "displayWidthPx" to currentDisplayWidth(),
      "displayHeightPx" to currentDisplayHeight(),
      "positionSaved" to (
        prefs.contains(PREF_X) &&
        prefs.contains(PREF_Y)
      ),
      "scale" to currentScale.toDouble(),
      "autoMoveEnabled" to autoMoveEnabled
    )
  }

  // CHARACTER_V101O_SAFE_RUNTIME_REPAIR
  private fun repairVisibleRuntime() {
    if (homeHandoffActive) {
      return
    }

    showOrUpdateOverlay(
      readSelectedCharacter(
        this
      )
    )

    scheduleDisplayReconcile()

    if (screenInteractive) {
      refreshQuietMode(
        force = true
      )

      scheduleBehaviorStateCheck()

      if (
        autoMoveEnabled &&
        !shouldSuppressAutoMoveForQuiet()
      ) {
        autoMoveResumeAt =
          SystemClock.uptimeMillis() +
            SCREEN_RESUME_DELAY_MS

        startAutoMoveLoop(
          SCREEN_RESUME_DELAY_MS
        )
      }

      if (
        !quietActive &&
        goalSpeechEnabled
      ) {
        scheduleNextGoalSpeech(
          initial = true
        )
      }
    }
    else {
      suspendVisualRuntimeForScreenOff()
    }
  }

  // CHARACTER_V101O_SAFE_POSITION_RESET
  private fun resetOverlayPositionInternal() {
    prefs
      .edit()
      .remove(PREF_X)
      .remove(PREF_Y)
      .remove(PREF_DISPLAY_WIDTH_PX)
      .remove(PREF_DISPLAY_HEIGHT_PX)
      .apply()

    userAvoidZones.clear()

    if (homeHandoffActive) {
      return
    }

    val view =
      overlayView
    val params =
      overlayParams

    if (
      view == null ||
      params == null
    ) {
      showOrUpdateOverlay(
        readSelectedCharacter(
          this
        )
      )
      scheduleDisplayReconcile()
      return
    }

    params.x =
      dp(18)
    params.y =
      dp(180)

    clampOverlayPosition(
      params
    )

    try {
      windowManager.updateViewLayout(
        view,
        params
      )
    }
    catch (
      ignored: Throwable
    ) {
    }

    saveOverlayPosition(
      params
    )
    scheduleDisplayReconcile()
  }

  // CHARACTER_V101N_HOME_HANDOFF_VISIBILITY
  private fun applyHomeHandoff(
    active: Boolean
  ) {
    if (
      homeHandoffActive ==
        active
    ) {
      return
    }

    homeHandoffActive =
      active

    if (active) {
      overlayParams
        ?.let {
          saveOverlayPosition(
            it
          )
        }

      suspendVisualRuntimeForScreenOff()
      completionQueue.clear()
      lifestyleReactionQueue.clear()
      completionReactionActive = false
      lifestyleReactionActive = false

      detachOverlayViewForHomeHandoff()
      return
    }

    showOrUpdateOverlay(
      readSelectedCharacter(
        this
      )
    )

    scheduleDisplayReconcile()

    if (screenInteractive) {
      refreshQuietMode(
        force = true
      )

      scheduleBehaviorStateCheck()

      if (
        autoMoveEnabled &&
        !shouldSuppressAutoMoveForQuiet()
      ) {
        autoMoveResumeAt =
          SystemClock.uptimeMillis() +
            SCREEN_RESUME_DELAY_MS

        startAutoMoveLoop(
          SCREEN_RESUME_DELAY_MS
        )
      }

      if (
        !quietActive &&
        goalSpeechEnabled
      ) {
        scheduleNextGoalSpeech(
          initial = true
        )
      }
    }
    else {
      suspendVisualRuntimeForScreenOff()
    }
  }

  private fun detachOverlayViewForHomeHandoff() {
    val view =
      overlayView

    if (view != null) {
      try {
        windowManager.removeView(
          view
        )
      }
      catch (
        ignored: Throwable
      ) {
      }
    }

    overlayView = null
    overlayParams = null
  }

  private fun createNotificationChannel() {
    if (
      Build.VERSION.SDK_INT <
      Build.VERSION_CODES.O
    ) {
      return
    }

    val manager =
      getSystemService(
        NotificationManager::class.java
      )

    manager.createNotificationChannel(
      NotificationChannel(
        CHANNEL_ID,
        "ROOT 화면 위 캐릭터",
        NotificationManager.IMPORTANCE_LOW
      ).apply {
        description =
          "ROOT 앱을 닫아도 선택한 캐릭터를 화면 위에 표시합니다."
      }
    )
  }

  private fun promoteToForeground() {
    val notification =
      buildNotification()

    if (
      Build.VERSION.SDK_INT >=
      Build.VERSION_CODES.UPSIDE_DOWN_CAKE
    ) {
      startForeground(
        NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
      )
    }
    else {
      startForeground(
        NOTIFICATION_ID,
        notification
      )
    }
  }

  private fun buildNotification(): Notification {
    val launchIntent =
      packageManager
        .getLaunchIntentForPackage(
          packageName
        )

    val contentIntent =
      launchIntent
        ?.let {
          PendingIntent.getActivity(
            this,
            7101,
            it,
            PendingIntent.FLAG_UPDATE_CURRENT or
              PendingIntent.FLAG_IMMUTABLE
          )
        }

    val stopPendingIntent =
      PendingIntent.getService(
        this,
        7102,
        Intent(
          this,
          RootFloatingCharacterService::class.java
        ).apply {
          action = ACTION_STOP
        },
        PendingIntent.FLAG_UPDATE_CURRENT or
          PendingIntent.FLAG_IMMUTABLE
      )

    val builder =
      if (
        Build.VERSION.SDK_INT >=
        Build.VERSION_CODES.O
      ) {
        Notification.Builder(
          this,
          CHANNEL_ID
        )
      }
      else {
        @Suppress(
          "DEPRECATION"
        )
        Notification.Builder(
          this
        )
      }

    builder
      .setSmallIcon(
        R.drawable.root_overlay_notification
      )
      .setContentTitle(
        "ROOT 캐릭터가 화면 위에 있어요"
      )
      .setContentText(
        "드래그·두 손가락 크기 조절·자동 이동을 사용할 수 있어요."
      )
      .setOngoing(
        true
      )
      .setCategory(
        Notification.CATEGORY_SERVICE
      )
      .setVisibility(
        Notification.VISIBILITY_PUBLIC
      )
      .addAction(
        Notification.Action.Builder(
          null,
          "숨기기",
          stopPendingIntent
        ).build()
      )

    if (contentIntent != null) {
      builder.setContentIntent(
        contentIntent
      )
    }

    return builder.build()
  }

  private fun showOrUpdateOverlay(
    characterId: String
  ) {
    if (
      Build.VERSION.SDK_INT >=
        Build.VERSION_CODES.M &&
      !Settings.canDrawOverlays(
        this
      )
    ) {
      stopSelf()
      return
    }

    val safeId =
      sanitizeCharacterId(
        characterId
      )

    prefs
      .edit()
      .putString(
        PREF_CHARACTER_ID,
        safeId
      )
      .apply()

    if (homeHandoffActive) {
      animatedCharacterId =
        safeId
      return
    }

    val existing =
      overlayView

    if (existing != null) {
      startIdleAnimation(
        safeId
      )
      applyOverlayScale(
        readScale(
          this
        ),
        persist = false
      )
      setAutoMoveEnabledInternal(
        readAutoMoveEnabled(
          this
        ),
        persist = false
      )
      goalSpeechEnabled =
        readGoalSpeechEnabled(
          this
        )
      scheduleNextGoalSpeech(
        initial = true
      )
      return
    }

    currentScale =
      readScale(
        this
      )

    autoMoveEnabled =
      readAutoMoveEnabled(
        this
      )

    val imageView =
      ImageView(
        this
      ).apply {
        setImageResource(
          drawableForCharacter(
            safeId
          )
        )
        scaleType =
          ImageView.ScaleType.CENTER_INSIDE
        adjustViewBounds = true
        contentDescription =
          "ROOT floating character"
      }

    val type =
      if (
        Build.VERSION.SDK_INT >=
        Build.VERSION_CODES.O
      ) {
        WindowManager
          .LayoutParams
          .TYPE_APPLICATION_OVERLAY
      }
      else {
        @Suppress(
          "DEPRECATION"
        )
        WindowManager
          .LayoutParams
          .TYPE_PHONE
      }

    val params =
      WindowManager.LayoutParams(
        scaledWidth(
          currentScale
        ),
        scaledHeight(
          currentScale
        ),
        type,
        WindowManager
          .LayoutParams
          .FLAG_NOT_FOCUSABLE or
          WindowManager
            .LayoutParams
            .FLAG_NOT_TOUCH_MODAL or
          WindowManager
            .LayoutParams
            .FLAG_LAYOUT_NO_LIMITS,
        PixelFormat.TRANSLUCENT
      ).apply {
        gravity =
          Gravity.TOP or
            Gravity.START

        x =
          prefs.getInt(
            PREF_X,
            dp(
              18
            )
          )
        y =
          prefs.getInt(
            PREF_Y,
            dp(
              180
            )
          )
      }

    restoreOverlayPositionForCurrentDisplay(
      params
    )

    attachDragAndTap(
      imageView,
      params
    )

    try {
      windowManager.addView(
        imageView,
        params
      )

      overlayView = imageView
      overlayParams = params

      startIdleAnimation(
        safeId
      )

      if (autoMoveEnabled) {
        startAutoMoveLoop(
          1200L
        )
      }

      scheduleNextGoalSpeech(
        initial = true
      )
    }
    catch (
      ignored: Throwable
    ) {
      stopSelf()
    }
  }

  // CHARACTER_V101C_DRAG_PINCH_SCALE
  private fun attachDragAndTap(
    imageView: ImageView,
    params: WindowManager.LayoutParams
  ) {
    var downRawX = 0f
    var downRawY = 0f
    var startX = 0
    var startY = 0
    var hadScaleGesture = false
    var downEventTime = 0L

    val scaleDetector =
      ScaleGestureDetector(
        this,
        object :
          ScaleGestureDetector
            .SimpleOnScaleGestureListener() {
          override fun onScaleBegin(
            detector: ScaleGestureDetector
          ): Boolean {
            hadScaleGesture = true
            beginUserInteraction()
            setMovementAnimation(
              false
            )
            return true
          }

          override fun onScale(
            detector: ScaleGestureDetector
          ): Boolean {
            applyOverlayScale(
              currentScale *
                detector.scaleFactor,
              persist = false
            )
            return true
          }

          override fun onScaleEnd(
            detector: ScaleGestureDetector
          ) {
            persistScaleAndPosition()
            endUserInteraction()
          }
        }
      )

    imageView.setOnTouchListener {
      _,
      event ->

      scaleDetector.onTouchEvent(
        event
      )

      when (event.actionMasked) {
        MotionEvent.ACTION_DOWN -> {
          hadScaleGesture = false
          downEventTime =
            event.eventTime
          hideActionMenu()
          beginUserInteraction()

          downRawX = event.rawX
          downRawY = event.rawY
          startX = params.x
          startY = params.y
          true
        }

        MotionEvent.ACTION_POINTER_DOWN -> {
          hadScaleGesture = true
          beginUserInteraction()
          true
        }

        MotionEvent.ACTION_MOVE -> {
          if (
            event.pointerCount == 1 &&
            !scaleDetector.isInProgress &&
            !hadScaleGesture
          ) {
            val moved =
              abs(
                event.rawX -
                  downRawX
              ) +
                abs(
                  event.rawY -
                    downRawY
                )

            if (
              moved >=
              dp(
                6
              )
            ) {
              setMovementAnimation(
                true
              )
            }

            params.x =
              startX +
                (
                  event.rawX -
                    downRawX
                ).toInt()

            params.y =
              startY +
                (
                  event.rawY -
                    downRawY
                ).toInt()

            clampOverlayPosition(
              params
            )

            safelyUpdateOverlayLayout(
              imageView,
              params
            )
          }

          true
        }

        MotionEvent.ACTION_POINTER_UP ->
          true

        MotionEvent.ACTION_UP -> {
          persistScaleAndPosition()

          if (!hadScaleGesture) {
            val moved =
              abs(
                event.rawX -
                  downRawX
              ) +
                abs(
                  event.rawY -
                    downRawY
                )

            if (
              moved >=
                dp(
                  USER_REJECT_DRAG_DISTANCE_DP
                )
            ) {
              rememberUserRejectedAreaAfterDrag(
                startX =
                  startX,
                startY =
                  startY,
                endX =
                  params.x,
                endY =
                  params.y,
                params =
                  params
              )
            }

            if (
              moved <
              dp(
                10
              )
            ) {
              val pressDuration =
                event.eventTime -
                  downEventTime

              if (
                pressDuration >=
                LONG_PRESS_MS
              ) {
                showActionMenu()
              }
              else {
                showTapReaction()
              }
            }
          }

          hadScaleGesture = false
          setMovementAnimation(
            false
          )
          endUserInteraction()
          true
        }

        MotionEvent.ACTION_CANCEL -> {
          persistScaleAndPosition()
          hadScaleGesture = false
          setMovementAnimation(
            false
          )
          endUserInteraction()
          true
        }

        else ->
          true
      }
    }
  }

  // CHARACTER_V101I_QUIET_POLICY
  private fun shouldSuppressAutoMoveForQuiet():
    Boolean =
    scheduledQuietActive &&
    readQuietStopAutoMove(
      this
    )

  private fun silentlyDismissAutomaticReactions() {
    speechHandler.removeCallbacks(
      goalSpeechRunnable
    )
    speechHandler.removeCallbacks(
      retryCompletionReactionRunnable
    )
    speechHandler.removeCallbacks(
      finishCompletionReactionRunnable
    )
    speechHandler.removeCallbacks(
      retryLifestyleReactionRunnable
    )
    speechHandler.removeCallbacks(
      finishLifestyleReactionRunnable
    )

    completionQueue.clear()
    lifestyleReactionQueue.clear()
    completionReactionActive = false
    lifestyleReactionActive = false

    if (happyAnimationActive) {
      happyAnimationActive = false
      happyAnimationStep = 0
      startIdleAnimation(
        animatedCharacterId
      )
    }

    hideSpeechBubble()
  }

  private fun refreshQuietMode(
    force: Boolean
  ) {
    val nextScheduled =
      isScheduledQuietNow(
        this
      )

    val nextActive =
      nextScheduled ||
      isTemporaryQuietNow(
        this
      )

    val changed =
      force ||
      nextActive !=
        quietActive ||
      nextScheduled !=
        scheduledQuietActive

    quietActive =
      nextActive

    scheduledQuietActive =
      nextScheduled

    if (!screenInteractive) {
      suspendVisualRuntimeForScreenOff()
      return
    }

    if (!changed) {
      return
    }

    if (quietActive) {
      silentlyDismissAutomaticReactions()

      if (
        shouldSuppressAutoMoveForQuiet()
      ) {
        stopAutoMoveLoop()

        startSleepAnimation(
          forcedByQuiet = true,
          preserveStationaryTime = false
        )
      }
      else {
        if (quietSleepForced) {
          quietSleepForced = false
          startIdleAnimation(
            animatedCharacterId
          )
        }

        if (
          autoMoveEnabled
        ) {
          startAutoMoveLoop(
            600L
          )
        }
      }

      return
    }

    if (quietSleepForced) {
      quietSleepForced = false
      startIdleAnimation(
        animatedCharacterId
      )
    }

    if (
      autoMoveEnabled
    ) {
      autoMoveResumeAt =
        SystemClock.uptimeMillis() +
          600L

      startAutoMoveLoop(
        600L
      )
    }

    if (
      goalSpeechEnabled
    ) {
      scheduleNextGoalSpeech(
        initial = true
      )
    }
  }

  private fun beginUserInteraction() {
    userInteracting = true
    autoTargetX = null
    autoTargetY = null

    happyAnimationActive = false
    happyAnimationStep = 0
    touchAnimationActive = false
    touchAnimationStep = 0
    quietSleepForced = false

    if (
      behaviorAnimationMode ==
        BehaviorAnimationMode.SIT ||
      behaviorAnimationMode ==
        BehaviorAnimationMode.SLEEP ||
      behaviorAnimationMode ==
        BehaviorAnimationMode.HAPPY ||
      behaviorAnimationMode ==
        BehaviorAnimationMode.TOUCH
    ) {
      startIdleAnimation(
        animatedCharacterId
      )
    }
    else {
      setMovementAnimation(
        false
      )
    }
  }

  private fun endUserInteraction() {
    userInteracting = false
    setMovementAnimation(
      false
    )

    autoMoveResumeAt =
      SystemClock.uptimeMillis() +
        AUTO_MOVE_RESUME_AFTER_TOUCH_MS

    if (
      autoMoveEnabled &&
      !shouldSuppressAutoMoveForQuiet()
    ) {
      startAutoMoveLoop(
        AUTO_MOVE_TICK_MS
      )
    }
  }

  private fun startAutoMoveLoop(
    delayMs: Long
  ) {
    motionHandler.removeCallbacks(
      motionRunnable
    )

    if (
      !screenInteractive ||
      !autoMoveEnabled ||
      shouldSuppressAutoMoveForQuiet()
    ) {
      return
    }

    motionHandler.postDelayed(
      motionRunnable,
      delayMs
    )
  }

  private fun stopAutoMoveLoop() {
    motionHandler.removeCallbacks(
      motionRunnable
    )
    autoTargetX = null
    autoTargetY = null
    setMovementAnimation(
      false
    )
  }

  private fun setAutoMoveEnabledInternal(
    enabled: Boolean,
    persist: Boolean
  ) {
    autoMoveEnabled = enabled

    if (persist) {
      prefs
        .edit()
        .putBoolean(
          PREF_AUTO_MOVE,
          enabled
        )
        .apply()
    }

    if (
      enabled &&
      !shouldSuppressAutoMoveForQuiet()
    ) {
      autoMoveResumeAt =
        SystemClock.uptimeMillis() +
          600L
      startAutoMoveLoop(
        600L
      )
    }
    else {
      stopAutoMoveLoop()
    }
  }

  // CHARACTER_V101K_SAFE_TARGET_SELECTION
  private fun chooseAutoMoveTarget(
    params: WindowManager.LayoutParams
  ) {
    val bounds =
      autoMoveSafeBounds(
        params
      )

    val minX =
      bounds[
        0
      ]
    val maxX =
      bounds[
        1
      ]
    val minY =
      bounds[
        2
      ]
    val maxY =
      bounds[
        3
      ]

    val radius =
      dp(
        AUTO_MOVE_TARGET_RADIUS_DP
      ).coerceAtLeast(
        1
      )

    val currentX =
      params.x.coerceIn(
        minX,
        maxX
      )

    val currentY =
      params.y.coerceIn(
        minY,
        maxY
      )

    val lowerStart =
      (
        minY +
          (
            (
              maxY -
                minY
            ) *
              58
          ) /
            100
      ).coerceIn(
        minY,
        maxY
      )

    var fallbackX =
      currentX
    var fallbackY =
      currentY

    repeat(
      AUTO_MOVE_TARGET_ATTEMPTS
    ) {
      attempt ->
      val nearLeft =
        params.x <=
          minX +
            dp(
              8
            )

      val nearRight =
        params.x >=
          maxX -
            dp(
              8
            )

      val aboveSafeBand =
        params.y <
          minY

      val candidateX: Int
      val candidateY: Int

      if (
        attempt ==
          0 &&
        (
          nearLeft ||
          nearRight ||
          aboveSafeBand
        )
      ) {
        candidateX =
          when {
            nearLeft ->
              (
                minX +
                  dp(
                    52
                  )
              ).coerceAtMost(
                maxX
              )

            nearRight ->
              (
                maxX -
                  dp(
                    52
                  )
              ).coerceAtLeast(
                minX
              )

            else ->
              currentX
          }

        candidateY =
          currentY.coerceIn(
            minY,
            maxY
          )
      }
      else {
        val roll =
          Random.nextInt(
            100
          )

        if (
          roll <
            AUTO_MOVE_EDGE_PERCH_CHANCE_PERCENT
        ) {
          candidateX =
            if (
              Random.nextBoolean()
            ) {
              minX
            }
            else {
              maxX
            }

          candidateY =
            randomInclusive(
              lowerStart,
              maxY
            )
        }
        else if (
          roll <
            AUTO_MOVE_EDGE_PERCH_CHANCE_PERCENT +
              AUTO_MOVE_LOWER_BAND_CHANCE_PERCENT
        ) {
          candidateX =
            (
              params.x +
                Random.nextInt(
                  -radius,
                  radius +
                    1
                )
            ).coerceIn(
              minX,
              maxX
            )

          candidateY =
            randomInclusive(
              lowerStart,
              maxY
            )
        }
        else {
          candidateX =
            (
              params.x +
                Random.nextInt(
                  -radius,
                  radius +
                    1
                )
            ).coerceIn(
              minX,
              maxX
            )

          candidateY =
            (
              params.y +
                Random.nextInt(
                  -radius,
                  radius +
                    1
                )
            ).coerceIn(
              minY,
              maxY
            )
        }
      }

      fallbackX =
        candidateX
      fallbackY =
        candidateY

      if (
        !isUserAvoidedTarget(
          candidateX,
          candidateY,
          params
        )
      ) {
        autoTargetX =
          candidateX
        autoTargetY =
          candidateY
        return
      }
    }

    autoTargetX =
      fallbackX
    autoTargetY =
      fallbackY
  }

  private fun randomInclusive(
    minValue: Int,
    maxValue: Int
  ): Int =
    if (
      maxValue <=
        minValue
    ) {
      minValue
    }
    else {
      Random.nextInt(
        minValue,
        maxValue +
          1
      )
    }

  // CHARACTER_V101K_KEYBOARD_BEST_EFFORT_AVOIDANCE
  private fun detectedKeyboardTop():
    Int? {
    val screenHeight =
      resources
        .displayMetrics
        .heightPixels

    if (
      Build.VERSION.SDK_INT >=
        Build.VERSION_CODES.R
    ) {
      try {
        val insets =
          windowManager
            .currentWindowMetrics
            .windowInsets

        if (
          insets.isVisible(
            android.view.WindowInsets
              .Type
              .ime()
          )
        ) {
          val imeBottom =
            insets
              .getInsets(
                android.view.WindowInsets
                  .Type
                  .ime()
              )
              .bottom

          if (
            imeBottom >=
              dp(
                KEYBOARD_VISIBLE_MIN_DP
              )
          ) {
            return (
              screenHeight -
                imeBottom
            ).coerceIn(
              0,
              screenHeight
            )
          }
        }
      }
      catch (
        ignored: Throwable
      ) {
      }
    }

    val view =
      overlayView
        ?: return null

    return try {
      val visibleFrame =
        android.graphics.Rect()

      view.getWindowVisibleDisplayFrame(
        visibleFrame
      )

      val obscuredBottom =
        screenHeight -
          visibleFrame.bottom

      if (
        obscuredBottom >=
          dp(
            KEYBOARD_VISIBLE_MIN_DP
          )
      ) {
        visibleFrame.bottom
          .coerceIn(
            0,
            screenHeight
          )
      }
      else {
        null
      }
    }
    catch (
      ignored: Throwable
    ) {
      null
    }
  }

  private fun autoMoveSafeBounds(
    params: WindowManager.LayoutParams
  ): IntArray {
    val physicalMaxX =
      (
        resources.displayMetrics.widthPixels -
          params.width
      ).coerceAtLeast(
        0
      )

    val physicalMaxY =
      (
        resources.displayMetrics.heightPixels -
          params.height
      ).coerceAtLeast(
        0
      )

    val edgeInset =
      dp(
        AUTO_MOVE_EDGE_INSET_DP
      ).coerceAtLeast(
        0
      )

    val minX =
      edgeInset.coerceAtMost(
        physicalMaxX
      )

    val maxX =
      (
        physicalMaxX -
          edgeInset
      ).coerceAtLeast(
        minX
      )

    val minY =
      dp(
        AUTO_MOVE_TOP_SAFE_DP
      ).coerceIn(
        0,
        physicalMaxY
      )

    var maxY =
      (
        physicalMaxY -
          dp(
            AUTO_MOVE_BOTTOM_SAFE_DP
          )
      ).coerceAtLeast(
        minY
      )

    val keyboardTop =
      detectedKeyboardTop()

    if (
      keyboardTop !=
        null
    ) {
      val keyboardSafeY =
        (
          keyboardTop -
            params.height -
            dp(
              AUTO_MOVE_KEYBOARD_GAP_DP
            )
        ).coerceAtLeast(
          minY
        )

      maxY =
        minOf(
          maxY,
          keyboardSafeY
        ).coerceAtLeast(
          minY
        )
    }

    return intArrayOf(
      minX,
      maxX,
      minY,
      maxY
    )
  }

  private fun adjustAutoMoveTargetForDynamicAvoidance(
    params: WindowManager.LayoutParams
  ): Boolean {
    val bounds =
      autoMoveSafeBounds(
        params
      )

    val safeX =
      params.x.coerceIn(
        bounds[
          0
        ],
        bounds[
          1
        ]
      )

    val safeY =
      params.y.coerceIn(
        bounds[
          2
        ],
        bounds[
          3
        ]
      )

    val currentOutsideSafeBounds =
      safeX !=
        params.x ||
      safeY !=
        params.y

    if (
      currentOutsideSafeBounds
    ) {
      autoTargetX =
        safeX
      autoTargetY =
        safeY
      autoMovePauseUntil =
        0L
      return true
    }

    val targetX =
      autoTargetX
    val targetY =
      autoTargetY

    if (
      targetX !=
        null &&
      targetY !=
        null
    ) {
      val clampedTargetX =
        targetX.coerceIn(
          bounds[
            0
          ],
          bounds[
            1
          ]
        )

      val clampedTargetY =
        targetY.coerceIn(
          bounds[
            2
          ],
          bounds[
            3
          ]
        )

      if (
        clampedTargetX !=
          targetX ||
        clampedTargetY !=
          targetY ||
        isUserAvoidedTarget(
          clampedTargetX,
          clampedTargetY,
          params
        )
      ) {
        autoTargetX =
          null
        autoTargetY =
          null
        chooseAutoMoveTarget(
          params
        )
        autoMovePauseUntil =
          0L
        return true
      }
    }

    return false
  }

  private fun purgeExpiredUserAvoidZones() {
    val now =
      SystemClock.uptimeMillis()

    userAvoidZones.removeAll {
      zone ->
      zone.untilAt <=
        now
    }
  }

  private fun isUserAvoidedTarget(
    x: Int,
    y: Int,
    params: WindowManager.LayoutParams
  ): Boolean {
    purgeExpiredUserAvoidZones()

    if (userAvoidZones.isEmpty()) {
      return false
    }

    val centerX =
      x +
        params.width /
          2

    val centerY =
      y +
        params.height /
          2

    val radius =
      dp(
        USER_AVOID_RADIUS_DP
      ).coerceAtLeast(
        1
      )

    val radiusSquared =
      radius.toLong() *
        radius.toLong()

    return userAvoidZones.any {
      zone ->
      val dx =
        (
          centerX -
            zone.centerX
        ).toLong()

      val dy =
        (
          centerY -
            zone.centerY
        ).toLong()

      dx *
        dx +
        dy *
          dy <=
        radiusSquared
    }
  }

  private fun rememberUserRejectedAreaAfterDrag(
    startX: Int,
    startY: Int,
    endX: Int,
    endY: Int,
    params: WindowManager.LayoutParams
  ) {
    val moved =
      abs(
        endX -
          startX
      ) +
        abs(
          endY -
            startY
        )

    if (
      moved <
        dp(
          USER_REJECT_DRAG_DISTANCE_DP
        )
    ) {
      return
    }

    purgeExpiredUserAvoidZones()

    val endCenterX =
      endX +
        params.width /
          2

    val endCenterY =
      endY +
        params.height /
          2

    val radius =
      dp(
        USER_AVOID_RADIUS_DP
      ).coerceAtLeast(
        1
      )

    val destinationZone =
      userAvoidZones.firstOrNull {
        zone ->
        val dx =
          (
            endCenterX -
              zone.centerX
          ).toLong()

        val dy =
          (
            endCenterY -
              zone.centerY
          ).toLong()

        dx *
          dx +
          dy *
            dy <=
          radius.toLong() *
            radius.toLong()
      }

    if (
      destinationZone !=
        null
    ) {
      userAvoidZones.remove(
        destinationZone
      )
      return
    }

    val startCenterX =
      startX +
        params.width /
          2

    val startCenterY =
      startY +
        params.height /
          2

    val mergeRadius =
      (
        radius /
          2
      ).coerceAtLeast(
        1
      )

    userAvoidZones.removeAll {
      zone ->
      abs(
        zone.centerX -
          startCenterX
      ) <=
        mergeRadius &&
      abs(
        zone.centerY -
          startCenterY
      ) <=
        mergeRadius
    }

    userAvoidZones.add(
      UserAvoidZone(
        centerX =
          startCenterX,
        centerY =
          startCenterY,
        untilAt =
          SystemClock.uptimeMillis() +
            USER_AVOID_MEMORY_MS
      )
    )

    while (
      userAvoidZones.size >
        USER_AVOID_ZONE_LIMIT
    ) {
      userAvoidZones.removeAt(
        0
      )
    }

    autoTargetX = null
    autoTargetY = null
  }

  private fun nudgeQuietSleepAboveKeyboardIfNeeded() {
    if (!autoMoveEnabled) {
      return
    }

    val view =
      overlayView
        ?: return

    val params =
      overlayParams
        ?: return

    val keyboardTop =
      detectedKeyboardTop()
        ?: return

    val safeY =
      (
        keyboardTop -
          params.height -
          dp(
            AUTO_MOVE_KEYBOARD_GAP_DP
          )
      ).coerceAtLeast(
        dp(
          AUTO_MOVE_TOP_SAFE_DP
        ).coerceAtMost(
          (
            resources.displayMetrics.heightPixels -
              params.height
          ).coerceAtLeast(
            0
          )
        )
      )

    if (
      params.y >
        safeY
    ) {
      params.y =
        safeY

      clampOverlayPosition(
        params
      )

      safelyUpdateOverlayLayout(
        view,
        params
      )
    }
  }

  private fun stepToward(
    current: Int,
    target: Int,
    step: Int
  ): Int =
    when {
      current < target ->
        (current + step)
          .coerceAtMost(
            target
          )
      current > target ->
        (current - step)
          .coerceAtLeast(
            target
          )
      else ->
        current
    }

  private fun applyOverlayScale(
    requestedScale: Float,
    persist: Boolean
  ) {
    val safeScale =
      requestedScale.coerceIn(
        MIN_SCALE,
        MAX_SCALE
      )

    currentScale = safeScale

    val params =
      overlayParams

    if (params != null) {
      val centerX =
        params.x +
          params.width /
            2
      val centerY =
        params.y +
          params.height /
            2

      params.width =
        scaledWidth(
          safeScale
        )
      params.height =
        scaledHeight(
          safeScale
        )

      params.x =
        centerX -
          params.width /
            2
      params.y =
        centerY -
          params.height /
            2

      clampOverlayPosition(
        params
      )

      overlayView
        ?.let {
          safelyUpdateOverlayLayout(
            it,
            params
          )
        }

      autoTargetX = null
      autoTargetY = null
    }

    if (persist) {
      persistScaleAndPosition()
    }
  }

  private fun persistScaleAndPosition() {
    val displayWidth =
      currentDisplayWidth()
    val displayHeight =
      currentDisplayHeight()

    lastKnownDisplayWidth =
      displayWidth
    lastKnownDisplayHeight =
      displayHeight

    val editor =
      prefs
        .edit()
        .putFloat(
          PREF_SCALE,
          currentScale
        )
        .putInt(
          PREF_DISPLAY_WIDTH_PX,
          displayWidth
        )
        .putInt(
          PREF_DISPLAY_HEIGHT_PX,
          displayHeight
        )

    overlayParams
      ?.let {
        editor
          .putInt(
            PREF_X,
            it.x
          )
          .putInt(
            PREF_Y,
            it.y
          )
      }

    editor.apply()
  }

  private fun saveOverlayPosition(
    params: WindowManager.LayoutParams
  ) {
    val displayWidth =
      currentDisplayWidth()
    val displayHeight =
      currentDisplayHeight()

    lastKnownDisplayWidth =
      displayWidth
    lastKnownDisplayHeight =
      displayHeight

    prefs
      .edit()
      .putInt(
        PREF_X,
        params.x
      )
      .putInt(
        PREF_Y,
        params.y
      )
      .putInt(
        PREF_DISPLAY_WIDTH_PX,
        displayWidth
      )
      .putInt(
        PREF_DISPLAY_HEIGHT_PX,
        displayHeight
      )
      .apply()
  }

  private fun clampOverlayPosition(
    params: WindowManager.LayoutParams
  ) {
    val maxX =
      (
        resources.displayMetrics.widthPixels -
          params.width
      ).coerceAtLeast(
        0
      )

    val maxY =
      (
        resources.displayMetrics.heightPixels -
          params.height
      ).coerceAtLeast(
        0
      )

    params.x =
      params.x.coerceIn(
        0,
        maxX
      )
    params.y =
      params.y.coerceIn(
        0,
        maxY
      )
  }

  private fun safelyUpdateOverlayLayout(
    imageView: ImageView,
    params: WindowManager.LayoutParams
  ) {
    try {
      windowManager.updateViewLayout(
        imageView,
        params
      )

      updateAuxiliaryOverlayPositions()
    }
    catch (
      ignored: Throwable
    ) {
    }
  }

  // CHARACTER_V101E_TAP_LONG_PRESS_MENU
  // CHARACTER_V101G_CHARACTER_TAP_VOICE
  private fun showTapReaction() {
    val reactions =
      tapReactionsForCharacter(
        animatedCharacterId
      )

    startTouchAnimation(
      animatedCharacterId
    )

    showSpeechBubble(
      reactions[
        Random.nextInt(
          reactions.size
        )
      ],
      TAP_REACTION_DISPLAY_MS
    )
  }

  private fun overlayWindowType(): Int =
    if (
      Build.VERSION.SDK_INT >=
      Build.VERSION_CODES.O
    ) {
      WindowManager
        .LayoutParams
        .TYPE_APPLICATION_OVERLAY
    }
    else {
      @Suppress(
        "DEPRECATION"
      )
      WindowManager
        .LayoutParams
        .TYPE_PHONE
    }

  private fun speechBubbleBackground():
    GradientDrawable =
    GradientDrawable().apply {
      shape =
        GradientDrawable
          .RECTANGLE
      setColor(
        Color.argb(
          244,
          255,
          255,
          255
        )
      )
      cornerRadius =
        dp(
          16
        ).toFloat()
      setStroke(
        dp(
          1
        ).coerceAtLeast(
          1
        ),
        Color.argb(
          40,
          0,
          0,
          0
        )
      )
    }

  private fun menuBackground():
    GradientDrawable =
    GradientDrawable().apply {
      shape =
        GradientDrawable
          .RECTANGLE
      setColor(
        Color.argb(
          250,
          255,
          255,
          255
        )
      )
      cornerRadius =
        dp(
          14
        ).toFloat()
      setStroke(
        dp(
          1
        ).coerceAtLeast(
          1
        ),
        Color.argb(
          45,
          0,
          0,
          0
        )
      )
    }

  private fun showSpeechBubble(
    message: String,
    durationMs: Long
  ) {
    if (!screenInteractive) {
      return
    }

    val characterParams =
      overlayParams
        ?: return

    hideSpeechBubble()
    setMovementAnimation(
      false
    )

    autoMovePauseUntil =
      maxOf(
        autoMovePauseUntil,
        SystemClock.uptimeMillis() +
          durationMs
      )

    val bubble =
      TextView(
        this
      ).apply {
        text =
          message
            .trim()
            .take(
              90
            )
        setTextColor(
          Color.rgb(
            35,
            35,
            35
          )
        )
        textSize =
          14f
        gravity =
          Gravity.CENTER
        maxLines =
          3
        setPadding(
          dp(
            14
          ),
          dp(
            10
          ),
          dp(
            14
          ),
          dp(
            10
          )
        )
        background =
          speechBubbleBackground()
        elevation =
          dp(
            8
          ).toFloat()
      }

    val params =
      WindowManager.LayoutParams(
        dp(
          230
        ),
        ViewGroup
          .LayoutParams
          .WRAP_CONTENT,
        overlayWindowType(),
        WindowManager
          .LayoutParams
          .FLAG_NOT_FOCUSABLE or
          WindowManager
            .LayoutParams
            .FLAG_NOT_TOUCHABLE or
          WindowManager
            .LayoutParams
            .FLAG_NOT_TOUCH_MODAL,
        PixelFormat.TRANSLUCENT
      ).apply {
        gravity =
          Gravity.TOP or
            Gravity.START
      }

    speechBubbleView =
      bubble
    speechBubbleParams =
      params

    positionSpeechBubble(
      characterParams,
      params
    )

    try {
      windowManager.addView(
        bubble,
        params
      )

      speechHandler.removeCallbacks(
        hideSpeechRunnable
      )
      speechHandler.postDelayed(
        hideSpeechRunnable,
        durationMs
      )
    }
    catch (
      ignored: Throwable
    ) {
      speechBubbleView = null
      speechBubbleParams = null
    }
  }

  private fun hideSpeechBubble() {
    speechHandler.removeCallbacks(
      hideSpeechRunnable
    )

    val bubble =
      speechBubbleView

    if (bubble != null) {
      try {
        windowManager.removeView(
          bubble
        )
      }
      catch (
        ignored: Throwable
      ) {
      }
    }

    speechBubbleView = null
    speechBubbleParams = null
  }

  private fun createMenuButton(
    label: String,
    onClick: () -> Unit
  ): TextView =
    TextView(
      this
    ).apply {
      text =
        label
      setTextColor(
        Color.rgb(
          35,
          35,
          35
        )
      )
      textSize =
        15f
      gravity =
        Gravity.CENTER
      setPadding(
        dp(
          14
        ),
        dp(
          12
        ),
        dp(
          14
        ),
        dp(
          12
        )
      )
      isClickable =
        true
      isFocusable =
        true
      setOnClickListener {
        onClick()
      }
      layoutParams =
        LinearLayout
          .LayoutParams(
            ViewGroup
              .LayoutParams
              .MATCH_PARENT,
            ViewGroup
              .LayoutParams
              .WRAP_CONTENT
          )
    }

  private fun showActionMenu() {
    val characterParams =
      overlayParams
        ?: return

    hideSpeechBubble()
    hideActionMenu()
    setMovementAnimation(
      false
    )

    autoMovePauseUntil =
      maxOf(
        autoMovePauseUntil,
        SystemClock.uptimeMillis() +
          ACTION_MENU_DISPLAY_MS
      )

    val menu =
      LinearLayout(
        this
      ).apply {
        orientation =
          LinearLayout.VERTICAL
        background =
          menuBackground()
        elevation =
          dp(
            10
          ).toFloat()
        setPadding(
          dp(
            4
          ),
          dp(
            4
          ),
          dp(
            4
          ),
          dp(
            4
          )
        )
      }

    menu.addView(
      createMenuButton(
        "캐릭터 끄기"
      ) {
        hideActionMenu()
        stopSelf()
      }
    )

    menu.addView(
      createMenuButton(
        "ROOT 가기"
      ) {
        hideActionMenu()
        openRootApp()
      }
    )

    val params =
      WindowManager.LayoutParams(
        dp(
          170
        ),
        ViewGroup
          .LayoutParams
          .WRAP_CONTENT,
        overlayWindowType(),
        WindowManager
          .LayoutParams
          .FLAG_NOT_FOCUSABLE or
          WindowManager
            .LayoutParams
            .FLAG_NOT_TOUCH_MODAL,
        PixelFormat.TRANSLUCENT
      ).apply {
        gravity =
          Gravity.TOP or
            Gravity.START
      }

    actionMenuView =
      menu
    actionMenuParams =
      params

    positionActionMenu(
      characterParams,
      params
    )

    try {
      windowManager.addView(
        menu,
        params
      )

      speechHandler.removeCallbacks(
        hideActionMenuRunnable
      )
      speechHandler.postDelayed(
        hideActionMenuRunnable,
        ACTION_MENU_DISPLAY_MS
      )
    }
    catch (
      ignored: Throwable
    ) {
      actionMenuView = null
      actionMenuParams = null
    }
  }

  private fun hideActionMenu() {
    speechHandler.removeCallbacks(
      hideActionMenuRunnable
    )

    val menu =
      actionMenuView

    if (menu != null) {
      try {
        windowManager.removeView(
          menu
        )
      }
      catch (
        ignored: Throwable
      ) {
      }
    }

    actionMenuView = null
    actionMenuParams = null
  }

  private fun positionSpeechBubble(
    characterParams:
      WindowManager.LayoutParams,
    bubbleParams:
      WindowManager.LayoutParams
  ) {
    val screenWidth =
      resources
        .displayMetrics
        .widthPixels

    val bubbleWidth =
      dp(
        230
      )

    bubbleParams.x =
      (
        characterParams.x +
          characterParams.width /
            2 -
          bubbleWidth /
            2
      ).coerceIn(
        0,
        (
          screenWidth -
            bubbleWidth
        ).coerceAtLeast(
          0
        )
      )

    bubbleParams.y =
      if (
        characterParams.y >=
        dp(
          78
        )
      ) {
        (
          characterParams.y -
            dp(
              72
            )
        ).coerceAtLeast(
          0
        )
      }
      else {
        characterParams.y +
          characterParams.height +
          dp(
            8
          )
      }
  }

  private fun positionActionMenu(
    characterParams:
      WindowManager.LayoutParams,
    menuParams:
      WindowManager.LayoutParams
  ) {
    val screenWidth =
      resources
        .displayMetrics
        .widthPixels

    val menuWidth =
      dp(
        170
      )

    menuParams.x =
      (
        characterParams.x +
          characterParams.width /
            2 -
          menuWidth /
            2
      ).coerceIn(
        0,
        (
          screenWidth -
            menuWidth
        ).coerceAtLeast(
          0
        )
      )

    menuParams.y =
      if (
        characterParams.y >=
        dp(
          118
        )
      ) {
        (
          characterParams.y -
            dp(
              112
            )
        ).coerceAtLeast(
          0
        )
      }
      else {
        characterParams.y +
          characterParams.height +
          dp(
            8
          )
      }
  }

  private fun updateAuxiliaryOverlayPositions() {
    val characterParams =
      overlayParams
        ?: return

    val bubble =
      speechBubbleView
    val bubbleParams =
      speechBubbleParams

    if (
      bubble != null &&
      bubbleParams != null
    ) {
      positionSpeechBubble(
        characterParams,
        bubbleParams
      )

      try {
        windowManager.updateViewLayout(
          bubble,
          bubbleParams
        )
      }
      catch (
        ignored: Throwable
      ) {
      }
    }

    val menu =
      actionMenuView
    val menuParams =
      actionMenuParams

    if (
      menu != null &&
      menuParams != null
    ) {
      positionActionMenu(
        characterParams,
        menuParams
      )

      try {
        windowManager.updateViewLayout(
          menu,
          menuParams
        )
      }
      catch (
        ignored: Throwable
      ) {
      }
    }
  }

  // CHARACTER_V101E_GOAL_SPEECH_ENGINE
  private fun applyGoalSnapshotInternal(
    goalsJson: String,
    persist: Boolean
  ) {
    val safeJson =
      sanitizedGoalSnapshotJson(
        goalsJson
      )

    pendingGoals =
      parseGoalSnapshot(
        safeJson
      )

    if (persist) {
      prefs
        .edit()
        .putString(
          PREF_GOALS_JSON,
          safeJson
        )
        .apply()
    }

    if (goalSpeechEnabled) {
      scheduleNextGoalSpeech(
        initial = true
      )
    }
    else {
      speechHandler.removeCallbacks(
        goalSpeechRunnable
      )
    }
  }

  private fun setGoalSpeechEnabledInternal(
    enabled: Boolean,
    persist: Boolean
  ) {
    goalSpeechEnabled =
      enabled

    if (persist) {
      prefs
        .edit()
        .putBoolean(
          PREF_GOAL_SPEECH,
          enabled
        )
        .apply()
    }

    speechHandler.removeCallbacks(
      goalSpeechRunnable
    )

    if (!enabled) {
      hideSpeechBubble()
      return
    }

    scheduleNextGoalSpeech(
      initial = true
    )
  }

  private fun scheduleNextGoalSpeech(
    initial: Boolean
  ) {
    speechHandler.removeCallbacks(
      goalSpeechRunnable
    )

    if (
      !screenInteractive ||
      !goalSpeechEnabled ||
      quietActive ||
      overlayView == null
    ) {
      return
    }

    val delay =
      if (initial) {
        Random.nextLong(
          GOAL_SPEECH_FIRST_MIN_MS,
          GOAL_SPEECH_FIRST_MAX_MS +
            1
        )
      }
      else {
        Random.nextLong(
          GOAL_SPEECH_MIN_INTERVAL_MS,
          GOAL_SPEECH_MAX_INTERVAL_MS +
            1
        )
      }

    speechHandler.postDelayed(
      goalSpeechRunnable,
      delay
    )
  }

  private fun showNextGoalSpeech(
    force: Boolean
  ): Boolean {
    if (
      !screenInteractive ||
      !goalSpeechEnabled ||
      quietActive ||
      overlayView == null
    ) {
      return false
    }

    if (
      !force &&
      (
        userInteracting ||
        walkingAnimationActive ||
        completionReactionActive ||
        completionQueue.isNotEmpty() ||
        lifestyleReactionActive ||
        lifestyleReactionQueue.isNotEmpty() ||
        actionMenuView != null
      )
    ) {
      return false
    }

    val contextualSpeech =
      buildTimeStateContextSpeech(
        force = force
      )

    if (
      contextualSpeech !=
        null
    ) {
      if (!force) {
        markTimeStateSpeechUsed(
          contextualSpeech.first
        )
      }

      showSpeechBubble(
        contextualSpeech.second,
        GOAL_SPEECH_DISPLAY_MS
      )

      return true
    }

    if (pendingGoals.isEmpty()) {
      if (force) {
        showSpeechBubble(
          "오늘 남은 행동목표가 없어! 지금은 편하게 있어도 돼.",
          TAP_REACTION_DISPLAY_MS
        )

        return true
      }

      return false
    }

    val lastGoalId =
      prefs.getString(
        PREF_LAST_GOAL_ID,
        null
      )

    val lastGoalAt =
      prefs.getLong(
        PREF_LAST_GOAL_AT,
        0L
      )

    val now =
      System.currentTimeMillis()

    if (
      !force &&
      pendingGoals.size ==
        1 &&
      pendingGoals[
        0
      ].first ==
        lastGoalId &&
      now -
        lastGoalAt <
        SAME_GOAL_COOLDOWN_MS
    ) {
      return false
    }

    val candidates =
      if (
        pendingGoals.size >
          1 &&
        lastGoalId != null
      ) {
        pendingGoals.filter {
          goal ->
          goal.first !=
            lastGoalId
        }
      }
      else {
        pendingGoals
      }

    val pool =
      if (candidates.isEmpty()) {
        pendingGoals
      }
      else {
        candidates
      }

    val goal =
      pool[
        Random.nextInt(
          pool.size
        )
      ]

    val message =
      buildGoalReminderMessage(
        goal.second
      )

    prefs
      .edit()
      .putString(
        PREF_LAST_GOAL_ID,
        goal.first
      )
      .putLong(
        PREF_LAST_GOAL_AT,
        now
      )
      .apply()

    showSpeechBubble(
      message,
      GOAL_SPEECH_DISPLAY_MS
    )

    return true
  }

  // CHARACTER_V101H_TIME_STATE_CONTEXT_ENGINE
  private fun currentLifestyleContext():
    JSONObject =
    try {
      JSONObject(
        prefs.getString(
          PREF_LIFESTYLE_CONTEXT_JSON,
          "{}"
        )
          ?: "{}"
      )
    }
    catch (
      ignored: Throwable
    ) {
      JSONObject()
    }

  private fun localDateKey():
    String {
    val calendar =
      java.util.Calendar
        .getInstance()

    return String.format(
      java.util.Locale.US,
      "%04d-%02d-%02d",
      calendar.get(
        java.util.Calendar.YEAR
      ),
      calendar.get(
        java.util.Calendar.MONTH
      ) +
        1,
      calendar.get(
        java.util.Calendar.DAY_OF_MONTH
      )
    )
  }

  private fun currentHourOfDay():
    Int =
    java.util.Calendar
      .getInstance()
      .get(
        java.util.Calendar.HOUR_OF_DAY
      )

  private fun currentTimePeriod(
    hour: Int
  ): String =
    when (hour) {
      in 6..10 ->
        "morning"
      in 11..16 ->
        "day"
      in 17..21 ->
        "evening"
      else ->
        "late-night"
    }

  private fun isLateNightNow():
    Boolean =
    currentTimePeriod(
      currentHourOfDay()
    ) ==
      "late-night"

  private fun isLowMoodContext():
    Boolean {
    val context =
      currentLifestyleContext()

    return (
      context.has(
        "mood"
      ) &&
      context.optDouble(
        "mood",
        50.0
      ) <
        30.0
    )
  }

  private fun timeStateSpeechKeyUsed(
    key: String
  ): Boolean =
    (
      prefs.getStringSet(
        PREF_TIME_STATE_SPEECH_KEYS,
        emptySet()
      )
        ?: emptySet()
    )
      .contains(
        key
      )

  private fun markTimeStateSpeechUsed(
    key: String
  ) {
    val today =
      localDateKey()

    val used =
      (
        prefs.getStringSet(
          PREF_TIME_STATE_SPEECH_KEYS,
          emptySet()
        )
          ?: emptySet()
      )
        .filter {
          existing ->
          existing.startsWith(
            "$today|"
          )
        }
        .toMutableSet()

    used.add(
      key
    )

    prefs
      .edit()
      .putStringSet(
        PREF_TIME_STATE_SPEECH_KEYS,
        used
      )
      .apply()
  }

  private fun buildTimeStateContextSpeech(
    force: Boolean
  ): Pair<
    String,
    String
  >? {
    val context =
      currentLifestyleContext()

    val hour =
      currentHourOfDay()

    val period =
      currentTimePeriod(
        hour
      )

    val dateKey =
      context
        .optString(
          "dateKey",
          localDateKey()
        )
        .ifBlank {
          localDateKey()
        }

    val pending =
      context.optInt(
        "pendingGoalCount",
        pendingGoals.size
      )
        .coerceAtLeast(
          0
        )

    val completed =
      context.optInt(
        "completedGoalCount",
        0
      )
        .coerceAtLeast(
          0
        )

    val mood =
      if (
        context.has(
          "mood"
        )
      ) {
        context.optDouble(
          "mood",
          50.0
        )
      }
      else {
        50.0
      }

    val energy =
      if (
        context.has(
          "energy"
        )
      ) {
        context.optDouble(
          "energy",
          50.0
        )
      }
      else {
        50.0
      }

    val affection =
      if (
        context.has(
          "affection"
        )
      ) {
        context.optDouble(
          "affection",
          50.0
        )
      }
      else {
        50.0
      }

    val signal =
      when {
        period ==
          "late-night" ->
          "late-night"
        energy <=
          24.0 ->
          "exhausted"
        energy <=
          49.0 ->
          "tired"
        mood <
          30.0 ->
          "low-mood"
        energy >=
          75.0 &&
        pending >
          0 ->
          "energetic-goal"
        period ==
          "morning" ->
          "morning"
        period ==
          "day" &&
        completed >
          0 ->
          "day-progress"
        period ==
          "day" ->
          "day-check"
        period ==
          "evening" ->
          "evening"
        else ->
          return null
      }

    val key =
      "$dateKey|$period|$signal"

    if (
      !force &&
      timeStateSpeechKeyUsed(
        key
      )
    ) {
      return null
    }

    val bonded =
      affection >=
        75.0

    val message =
      buildTimeStateMessage(
        signal =
          signal,
        pending =
          pending,
        completed =
          completed,
        bonded =
          bonded
      )

    return key to
      message
  }

  private fun buildTimeStateMessage(
    signal: String,
    pending: Int,
    completed: Int,
    bonded: Boolean
  ): String {
    val warmEnding =
      if (bonded) {
        " 나랑 같이 천천히 가자."
      }
      else {
        ""
      }

    return when (signal) {
      "late-night" ->
        when (animatedCharacterId) {
          "moru" ->
            "이제 늦었어. 오늘은 여기까지 하고 쉬자.$warmEnding"
          "mongsil" ->
            "늦은 시간이야. 못 한 건 내일 천천히 해도 괜찮아.$warmEnding"
          "dami" ->
            "오늘도 수고했어! 이제는 편하게 쉬자 😊$warmEnding"
          "pio" ->
            "내일 또 움직이려면 충전해야지. 오늘은 쉬자!$warmEnding"
          "nuri" ->
            "오늘 미션은 여기까지! 휴식도 중요한 미션이야.$warmEnding"
          "tori" ->
            "이제 늦었어... 남은 건 내일 해도 돼.$warmEnding"
          else ->
            "오늘 못 한 건 내일 해도 돼. 이제 좀 쉬자.$warmEnding"
        }

      "exhausted" ->
        when (animatedCharacterId) {
          "moru" ->
            "에너지가 많이 낮아. 지금은 목표보다 쉬는 게 먼저야.$warmEnding"
          "dami" ->
            "많이 지친 것 같아. 오늘은 스스로도 좀 챙겨주자 😊$warmEnding"
          "pio" ->
            "지금은 충전 시간! 쉬어야 다음 탐험도 재밌지.$warmEnding"
          else ->
            "에너지가 많이 낮아 보여. 잠깐 쉬는 걸 먼저 해도 좋아.$warmEnding"
        }

      "tired" ->
        when (animatedCharacterId) {
          "moru" ->
            "조금 지쳤네. 잠깐 쉬고 다시 해보자.$warmEnding"
          "mongsil" ->
            "조금 피곤해 보여. 천천히 쉬었다가 해도 괜찮아.$warmEnding"
          "dami" ->
            "조금 쉬어도 돼! 쉬는 것도 잘하는 거야 😊$warmEnding"
          "pio" ->
            "잠깐 충전하고 다시 움직이자!$warmEnding"
          else ->
            "조금 지쳤네. 한 번 쉬었다가 남은 걸 보자.$warmEnding"
        }

      "low-mood" ->
        when (animatedCharacterId) {
          "moru" ->
            "오늘은 기분이 조금 가라앉았네. 무리해서 다 하려고 하지 말자.$warmEnding"
          "mongsil" ->
            "오늘 마음이 조금 무거운가 봐. 천천히 있어도 괜찮아.$warmEnding"
          "dami" ->
            "오늘은 내가 더 응원해줄게. 작은 것 하나만 해도 충분해 😊$warmEnding"
          "pio" ->
            "기분 전환이 필요하면 나중에 바람 쐬러 가자.$warmEnding"
          "nuri" ->
            "오늘은 작은 미션 하나만 깨도 성공이야.$warmEnding"
          "tori" ->
            "오늘은 천천히 가자... 무리하지 않아도 돼.$warmEnding"
          else ->
            "오늘 기분이 좀 가라앉았네. 남은 목표는 천천히 해도 돼.$warmEnding"
        }

      "energetic-goal" ->
        when (animatedCharacterId) {
          "moru" ->
            "지금 페이스 좋아! 남은 목표 $pending개 중 하나 바로 해볼까?"
          "mongsil" ->
            "지금은 에너지가 괜찮네. 남은 것 하나 천천히 해볼까?"
          "dami" ->
            "에너지 좋아 보여! 남은 목표도 충분히 할 수 있어 😊"
          "pio" ->
            "지금 에너지 좋다! 목표 하나 끝내고 어디 좀 가볼까?"
          "nuri" ->
            "에너지 충전 완료! 남은 미션 $pending개 중 하나 깨보자!"
          "tori" ->
            "지금은 컨디션이 괜찮아 보여... 하나 해볼까?"
          else ->
            "지금 에너지 좋아 보여! 남은 목표 하나 시작해볼까?"
        }

      "morning" ->
        if (
          pending >
            0
        ) {
          "좋은 아침! 오늘 목표 $pending개, 하나씩 시작해볼까?$warmEnding"
        }
        else {
          "좋은 아침! 오늘은 남은 행동목표가 없어. 가볍게 시작하자.$warmEnding"
        }

      "day-progress" ->
        when (animatedCharacterId) {
          "dami" ->
            "벌써 목표 $completed개 했네! 잘하고 있어 😊"
          "nuri" ->
            "지금까지 미션 $completed개 클리어! 흐름 좋아."
          "pio" ->
            "벌써 $completed개 해냈네! 남은 것 끝내면 밖에도 나가보자."
          else ->
            "지금까지 목표 $completed개 해냈어. 잘하고 있어!"
        }

      "evening" ->
        if (
          pending >
            0
        ) {
          when (animatedCharacterId) {
            "moru" ->
              "저녁이야. 오늘 남은 목표 $pending개, 가능한 것만 정리해보자."
            "mongsil" ->
              "저녁이네. 남은 목표 $pending개는 무리하지 말고 천천히 보자."
            "dami" ->
              "오늘 아직 $pending개 남았어. 할 수 있는 만큼만 해도 좋아 😊"
            "pio" ->
              "저녁이야! 남은 $pending개 중 하나 끝내고 여유 좀 만들자."
            "nuri" ->
              "오늘 남은 미션 $pending개! 가능한 것부터 골라보자."
            "tori" ->
              "오늘 아직 $pending개 남아 있어... 가능한 것만 해보자."
            else ->
              "오늘 아직 목표가 $pending개 남아 있어. 가능한 것부터 해보자."
          }
        }
        else {
          "오늘 할 목표는 다 정리됐어. 저녁은 편하게 보내자.$warmEnding"
        }

      else ->
        if (
          pending >
            0
        ) {
          "오늘 남은 목표가 $pending개 있어. 하나씩 해보자.$warmEnding"
        }
        else {
          "오늘 흐름 괜찮아. 지금 페이스 그대로 가자.$warmEnding"
        }
    }
  }

  private fun shouldSoftenNagging():
    Boolean =
    isLateNightNow() ||
    isLowMoodContext()

  // CHARACTER_V101G_CHARACTER_COMMUNICATION_TRAITS
  private fun pickMessage(
    messages: Array<String>
  ): String =
    messages[
      Random.nextInt(
        messages.size
      )
    ]

  private fun tapReactionsForCharacter(
    characterId: String
  ): Array<String> =
    when (characterId) {
      "moru" ->
        arrayOf(
          "불렀어? 지금 뭐부터 해볼까?",
          "좋아, 하나씩 해보자!",
          "여기 있어! 오늘도 움직여보자."
        )
      "mongsil" ->
        arrayOf(
          "응, 여기 있어.",
          "천천히 해도 괜찮아.",
          "조금 쉬었다가 같이 해도 좋아."
        )
      "dami" ->
        arrayOf(
          "응! 잘하고 있어 😊",
          "오늘도 같이 해보자!",
          "불렀어? 응원하러 왔어."
        )
      "pio" ->
        arrayOf(
          "응! 다음엔 어디 가볼까?",
          "불렀어? 새로운 곳도 찾아보자!",
          "오늘 할 일 끝내고 놀러 가자!"
        )
      "nuri" ->
        arrayOf(
          "좋아! 오늘도 하나 해내자!",
          "불렀어? 재밌게 해보자!",
          "조금만 더 하면 또 성장하겠는데?"
        )
      "tori" ->
        arrayOf(
          "응... 여기 있어.",
          "천천히 같이 가자.",
          "조금씩 해도 충분해."
        )
      else ->
        arrayOf(
          "응! 여기 있어 😊",
          "오늘도 같이 가자!",
          "불렀어?",
          "조금씩 해도 좋아!"
        )
    }

  private fun buildGoalReminderMessage(
    goalTitle: String
  ): String =
    when (animatedCharacterId) {
      "moru" ->
        pickMessage(
          arrayOf(
            "'$goalTitle' 아직 남았어! 지금 조금만 해볼까?",
            "'$goalTitle' 먼저 끝내고 쉬자!",
            "좋아, 다음은 '$goalTitle' 해보자."
          )
        )
      "mongsil" ->
        pickMessage(
          arrayOf(
            "'$goalTitle' 남아 있네. 천천히 해도 괜찮아.",
            "조금 힘들면 '$goalTitle'부터 아주 조금만 해볼까?",
            "'$goalTitle' 잊지만 않으면 돼."
          )
        )
      "dami" ->
        pickMessage(
          arrayOf(
            "'$goalTitle'도 할 수 있어! 내가 응원할게.",
            "오늘 '$goalTitle'까지 하면 정말 멋질 것 같아!",
            "'$goalTitle' 같이 끝내보자 😊"
          )
        )
      "pio" ->
        pickMessage(
          arrayOf(
            "'$goalTitle' 끝내고 새로운 데 가볼까?",
            "오늘 '$goalTitle' 남았어! 끝내고 놀러 가자.",
            "'$goalTitle' 해두면 마음 편하게 돌아다닐 수 있겠는데?"
          )
        )
      "nuri" ->
        pickMessage(
          arrayOf(
            "'$goalTitle' 하나 더 깨볼까?",
            "다음 미션은 '$goalTitle'!",
            "'$goalTitle'까지 하면 오늘 성장치 꽤 높겠어!"
          )
        )
      "tori" ->
        pickMessage(
          arrayOf(
            "'$goalTitle' 아직 남아 있어... 천천히 해보자.",
            "괜찮으면 '$goalTitle' 조금만 해볼까?",
            "'$goalTitle' 잊지 않았으면 좋겠어."
          )
        )
      else ->
        pickMessage(
          arrayOf(
            "오늘 '$goalTitle' 아직 남아 있어!",
            "'$goalTitle'도 같이 해볼까?",
            "오늘 '$goalTitle' 잊지 않았지?",
            "'$goalTitle' 조금만 해도 좋아!"
          )
        )
    }

  private fun buildCompletionMessage(
    goalTitle: String
  ): String =
    when (animatedCharacterId) {
      "moru" ->
        pickMessage(
          arrayOf(
            "'$goalTitle' 끝냈네! 좋아, 다음 것도 가보자!",
            "해냈다! '$goalTitle' 완료!",
            "'$goalTitle' 클리어! 오늘 페이스 좋은데?"
          )
        )
      "mongsil" ->
        pickMessage(
          arrayOf(
            "'$goalTitle' 해냈네. 정말 수고했어.",
            "잘했어. '$goalTitle' 끝냈으니 조금 쉬어도 돼.",
            "'$goalTitle' 완료했구나. 천천히 해도 결국 해냈네."
          )
        )
      "dami" ->
        pickMessage(
          arrayOf(
            "'$goalTitle' 완료! 정말 잘했어 😊",
            "와, '$goalTitle' 해냈네! 많이 칭찬해주고 싶어.",
            "오늘 또 하나 해냈다! '$goalTitle' 최고야!"
          )
        )
      "pio" ->
        pickMessage(
          arrayOf(
            "'$goalTitle' 끝! 이제 어디 가볼까?",
            "'$goalTitle' 해냈네! 다음엔 새로운 곳도 찾아보자.",
            "좋아! '$goalTitle' 완료. 탐험할 준비 됐는데?"
          )
        )
      "nuri" ->
        pickMessage(
          arrayOf(
            "'$goalTitle' 미션 클리어!",
            "좋아! '$goalTitle' 해냈다. 또 성장했어!",
            "'$goalTitle' 완료! 오늘 성취감 좋은데?"
          )
        )
      "tori" ->
        pickMessage(
          arrayOf(
            "'$goalTitle' 해냈네... 정말 잘했어.",
            "'$goalTitle' 완료했구나. 수고했어.",
            "조용히 하나 더 해냈네. '$goalTitle' 잘했어."
          )
        )
      else ->
        pickMessage(
          arrayOf(
            "'$goalTitle' 완료했네! 수고했어!",
            "오늘 목표 하나 더 끝냈다! '$goalTitle' 완료!",
            "좋아! '$goalTitle' 해냈네!",
            "완료! '$goalTitle' 정말 잘했어!"
          )
        )
    }

  private fun lifestyleReactionChancePercent(
    signal: String
  ): Int =
    when (signal) {
      "spend-praise" ->
        when (animatedCharacterId) {
          "dami" -> 100
          "nuri" -> 95
          "mongsil" -> 90
          "tori" -> 85
          "rooty" -> 85
          "pio" -> 80
          "moru" -> 75
          else -> 85
        }
      "spend-nag" ->
        when (animatedCharacterId) {
          "moru" -> 100
          "rooty" -> 80
          "nuri" -> 70
          "pio" -> 60
          "dami" -> 55
          "mongsil" -> 35
          "tori" -> 30
          else -> 80
        }
      "spend-nag-strong" ->
        100
      else ->
        100
    }

  private fun shouldUseLifestyleReaction(
    signal: String
  ): Boolean {
    val chance =
      lifestyleReactionChancePercent(
        signal
      )

    return (
      chance >=
        100 ||
      Random.nextInt(
        100
      ) <
        chance
    )
  }

  private fun buildLifestyleReactionMessage(
    signal: String
  ): String {
    if (
      (
        signal ==
          "spend-nag" ||
        signal ==
          "spend-nag-strong"
      ) &&
      shouldSoftenNagging()
    ) {
      return when (animatedCharacterId) {
        "moru" ->
          "오늘 지출이 늘었네. 지금은 쉬고, 내일 예산만 한번 정리해보자."
        "mongsil" ->
          "오늘 돈을 조금 많이 썼지만 지금은 늦었어. 내일 천천히 확인하자."
        "dami" ->
          "오늘 지출이 좀 컸어. 그래도 지금은 쉬고 내일 같이 정리해보자 😊"
        "pio" ->
          "오늘 지출이 늘었네. 여행비는 내일 다시 천천히 맞춰보자."
        "nuri" ->
          "지출 미션은 내일 다시 정리하자. 지금은 휴식 시간이야."
        "tori" ->
          "오늘 조금 많이 썼네... 지금은 쉬고 내일 확인해도 돼."
        else ->
          "오늘 지출이 조금 늘었어. 지금은 쉬고 내일 예산을 한번 확인하자."
      }
    }

    return when (signal) {
      "spend-praise" ->
        when (animatedCharacterId) {
          "moru" ->
            "오늘 지출 페이스 괜찮아! 이 흐름 유지해보자."
          "mongsil" ->
            "오늘은 돈도 무리하지 않고 잘 쓰고 있네."
          "dami" ->
            "오늘 지출 조절 정말 잘하고 있어! 잘했어 😊"
          "pio" ->
            "오늘 지출 괜찮아! 여행비도 잘 남겨두고 있네."
          "nuri" ->
            "지출 관리 미션도 잘하고 있는데? 좋아!"
          "tori" ->
            "오늘은 지출도 차분하게 잘 하고 있어."
          else ->
            "오늘 지출 흐름 좋아. 이대로 가보자!"
        }
      "spend-nag-strong" ->
        when (animatedCharacterId) {
          "moru" ->
            "오늘 지출이 꽤 커졌어! 다음 결제는 꼭 한 번 더 생각하자."
          "mongsil" ->
            "오늘은 지출이 많이 커졌네. 남은 건 조금 천천히 써보자."
          "dami" ->
            "오늘 돈을 많이 썼어. 남은 예산도 한번 확인해보자!"
          "pio" ->
            "오늘 너무 많이 썼어! 놀러 갈 돈도 남겨둬야지."
          "nuri" ->
            "오늘 지출 게이지가 많이 넘었어! 이제는 절약 미션이다."
          "tori" ->
            "오늘 지출이 많이 늘었어... 남은 돈은 조금 아껴보자."
          else ->
            "오늘 지출이 꽤 커졌어! 남은 예산 한번 확인해보자."
        }
      else ->
        when (animatedCharacterId) {
          "moru" ->
            "오늘 배정 예산을 넘었어! 다음 지출은 조금 줄여보자."
          "mongsil" ->
            "오늘 예산을 조금 넘었네. 다음엔 살짝 아껴보자."
          "dami" ->
            "오늘은 예산보다 조금 많이 썼어. 그래도 지금부터 조절하면 돼!"
          "pio" ->
            "오늘 예산 넘었어! 다음 여행비 생각해서 조금 아끼자."
          "nuri" ->
            "오늘 지출 게이지 초과! 이제 절약 쪽으로 가보자."
          "tori" ->
            "오늘 예산을 조금 넘었어... 남은 지출은 천천히 하자."
          else ->
            "오늘 배정 예산을 넘었어. 남은 지출은 조금 조심하자."
        }
    }
  }

  // CHARACTER_V101G_LIFESTYLE_REACTION_ENGINE
  private fun applyLifestyleContextInternal(
    incomingJson: String
  ) {
    val previousJson =
      prefs.getString(
        PREF_LIFESTYLE_CONTEXT_JSON,
        "{}"
      )
        ?: "{}"

    val mergedJson =
      mergeLifestyleContextJson(
        previousJson,
        incomingJson
      )

    val previous =
      try {
        JSONObject(
          previousJson
        )
      }
      catch (
        ignored: Throwable
      ) {
        JSONObject()
      }

    val current =
      try {
        JSONObject(
          mergedJson
        )
      }
      catch (
        ignored: Throwable
      ) {
        JSONObject()
      }

    prefs
      .edit()
      .putString(
        PREF_LIFESTYLE_CONTEXT_JSON,
        mergedJson
      )
      .apply()

    val baselineReady =
      prefs.getBoolean(
        PREF_LIFESTYLE_BASELINE_READY,
        false
      )

    val previousDate =
      previous
        .optString(
          "dateKey"
        )
        .trim()

    val currentDate =
      current
        .optString(
          "dateKey"
        )
        .trim()

    if (
      !baselineReady ||
      currentDate.isEmpty() ||
      (
        previousDate.isNotEmpty() &&
        previousDate !=
          currentDate
      )
    ) {
      prefs
        .edit()
        .putBoolean(
          PREF_LIFESTYLE_BASELINE_READY,
          true
        )
        .putStringSet(
          PREF_LIFESTYLE_REACTION_KEYS,
          emptySet()
        )
        .apply()

      return
    }

    if (
      !previous.has(
        "todayExpense"
      ) ||
      !previous.has(
        "dailyBudget"
      )
    ) {
      return
    }

    val previousDailyBudget =
      previous.optDouble(
        "dailyBudget",
        0.0
      )

    val currentDailyBudget =
      current.optDouble(
        "dailyBudget",
        0.0
      )

    val previousTodayExpense =
      previous.optDouble(
        "todayExpense",
        0.0
      )

    val currentTodayExpense =
      current.optDouble(
        "todayExpense",
        0.0
      )

    if (
      currentDailyBudget <=
        0.0 ||
      currentTodayExpense <=
        previousTodayExpense
    ) {
      return
    }

    val previousRatio =
      if (
        previousDailyBudget >
          0.0
      ) {
        previousTodayExpense /
          previousDailyBudget
      }
      else {
        0.0
      }

    val currentRatio =
      currentTodayExpense /
        currentDailyBudget

    val signal =
      when {
        previousRatio <
          1.50 &&
        currentRatio >=
          1.50 ->
          "spend-nag-strong"

        previousRatio <
          1.00 &&
        currentRatio >=
          1.00 ->
          "spend-nag"

        previousRatio <
          0.30 &&
        currentRatio >=
          0.30 &&
        currentRatio <=
          0.65 ->
          "spend-praise"

        else ->
          null
      }
        ?: return

    val reactionKey =
      "$currentDate|$signal"

    val usedKeys =
      (
        prefs.getStringSet(
          PREF_LIFESTYLE_REACTION_KEYS,
          emptySet()
        )
          ?: emptySet()
      )
        .toMutableSet()

    if (
      usedKeys.contains(
        reactionKey
      )
    ) {
      return
    }

    usedKeys.removeAll {
      key ->
      !key.startsWith(
        "$currentDate|"
      )
    }

    usedKeys.add(
      reactionKey
    )

    prefs
      .edit()
      .putStringSet(
        PREF_LIFESTYLE_REACTION_KEYS,
        usedKeys
      )
      .apply()

    if (
      !shouldUseLifestyleReaction(
        signal
      )
    ) {
      return
    }

    val now =
      System.currentTimeMillis()

    val lastReactionAt =
      prefs.getLong(
        PREF_LAST_LIFESTYLE_REACTION_AT,
        0L
      )

    val strong =
      signal ==
        "spend-nag-strong"

    if (
      !strong &&
      now -
        lastReactionAt <
        LIFESTYLE_REACTION_MIN_GAP_MS
    ) {
      return
    }

    lifestyleReactionQueue.add(
      signal to
        buildLifestyleReactionMessage(
          signal
        )
    )

    playNextLifestyleReaction()
  }

  private fun playNextLifestyleReaction() {
    if (homeHandoffActive) {
      lifestyleReactionQueue.clear()
      lifestyleReactionActive = false
      return
    }

    if (
      !screenInteractive ||
      lifestyleReactionActive ||
      lifestyleReactionQueue.isEmpty() ||
      overlayView == null
    ) {
      return
    }

    if (quietActive) {
      lifestyleReactionQueue.removeAt(
        0
      )
      return
    }

    if (
      userInteracting ||
      walkingAnimationActive ||
      completionReactionActive ||
      completionQueue.isNotEmpty() ||
      actionMenuView != null
    ) {
      speechHandler.removeCallbacks(
        retryLifestyleReactionRunnable
      )
      speechHandler.postDelayed(
        retryLifestyleReactionRunnable,
        LIFESTYLE_REACTION_BUSY_RETRY_MS
      )
      return
    }

    val reaction =
      lifestyleReactionQueue.removeAt(
        0
      )

    lifestyleReactionActive =
      true

    speechHandler.removeCallbacks(
      goalSpeechRunnable
    )
    speechHandler.removeCallbacks(
      finishLifestyleReactionRunnable
    )

    prefs
      .edit()
      .putLong(
        PREF_LAST_LIFESTYLE_REACTION_AT,
        System.currentTimeMillis()
      )
      .apply()

    setMovementAnimation(
      false
    )

    showSpeechBubble(
      reaction.second,
      LIFESTYLE_REACTION_DISPLAY_MS
    )

    speechHandler.postDelayed(
      finishLifestyleReactionRunnable,
      LIFESTYLE_REACTION_DISPLAY_MS +
        120L
    )
  }

  // CHARACTER_V101F_GOAL_COMPLETION_ENGINE
  private fun applyGoalCompletionSnapshotInternal(
    completionsJson: String,
    persist: Boolean
  ) {
    val safeJson =
      sanitizedGoalCompletionSnapshotJson(
        completionsJson
      )

    val completions =
      parseGoalCompletionSnapshot(
        safeJson
      )

    if (persist) {
      prefs
        .edit()
        .putString(
          PREF_COMPLETIONS_JSON,
          safeJson
        )
        .apply()
    }

    val baselineReady =
      prefs.getBoolean(
        PREF_COMPLETION_BASELINE_READY,
        false
      )

    val celebrated =
      (
        prefs.getStringSet(
          PREF_CELEBRATED_COMPLETION_KEYS,
          emptySet()
        )
          ?: emptySet()
      )
        .toMutableSet()

    if (!baselineReady) {
      completions.forEach {
        completion ->
        celebrated.add(
          completion.key
        )
      }

      prefs
        .edit()
        .putBoolean(
          PREF_COMPLETION_BASELINE_READY,
          true
        )
        .putStringSet(
          PREF_CELEBRATED_COMPLETION_KEYS,
          celebrated
        )
        .apply()

      return
    }

    val unseen =
      completions.filter {
        completion ->
        !celebrated.contains(
          completion.key
        )
      }

    if (unseen.isEmpty()) {
      return
    }

    val newestDate =
      unseen
        .last()
        .dateKey

    celebrated.removeAll {
      key ->
      !key.startsWith(
        "$newestDate|"
      )
    }

    unseen.forEach {
      completion ->
      celebrated.add(
        completion.key
      )
    }

    prefs
      .edit()
      .putStringSet(
        PREF_CELEBRATED_COMPLETION_KEYS,
        celebrated
      )
      .apply()

    unseen.forEach {
      completion ->
      if (
        completionQueue.none {
          queued ->
          queued.key ==
            completion.key
        }
      ) {
        completionQueue.add(
          completion
        )
      }
    }

    playNextGoalCompletionCelebration()
  }

  private fun playNextGoalCompletionCelebration() {
    if (homeHandoffActive) {
      completionQueue.clear()
      completionReactionActive = false
      return
    }

    if (
      !screenInteractive ||
      completionReactionActive ||
      completionQueue.isEmpty() ||
      overlayView == null
    ) {
      return
    }

    if (quietActive) {
      completionQueue.removeAt(
        0
      )
      return
    }

    if (
      userInteracting ||
      actionMenuView != null
    ) {
      speechHandler.removeCallbacks(
        retryCompletionReactionRunnable
      )
      speechHandler.postDelayed(
        retryCompletionReactionRunnable,
        COMPLETION_BUSY_RETRY_MS
      )
      return
    }

    val completion =
      completionQueue.removeAt(
        0
      )

    completionReactionActive = true
    autoTargetX = null
    autoTargetY = null

    speechHandler.removeCallbacks(
      retryLifestyleReactionRunnable
    )
    speechHandler.removeCallbacks(
      finishLifestyleReactionRunnable
    )
    lifestyleReactionActive = false

    speechHandler.removeCallbacks(
      goalSpeechRunnable
    )
    speechHandler.removeCallbacks(
      finishCompletionReactionRunnable
    )
    hideActionMenu()
    hideSpeechBubble()

    val message =
      buildCompletionMessage(
        completion.title
      )

    showSpeechBubble(
      message,
      COMPLETION_SPEECH_DISPLAY_MS
    )

    startHappyAnimation(
      animatedCharacterId
    )

    speechHandler.postDelayed(
      finishCompletionReactionRunnable,
      COMPLETION_SPEECH_DISPLAY_MS +
        120L
    )
  }

  private fun startHappyAnimation(
    characterId: String
  ) {
    animationHandler.removeCallbacks(
      animationRunnable
    )

    animatedCharacterId =
      characterId
    walkingAnimationActive = false
    behaviorAnimationMode =
      BehaviorAnimationMode.HAPPY
    behaviorFrameIndex = 0
    quietSleepForced = false
    touchAnimationActive = false
    touchAnimationStep = 0
    happyAnimationActive = true
    happyAnimationStep = 0
    animationFrameIndex = 0

    animationHandler.post(
      animationRunnable
    )
  }

  private fun openRootApp() {
    val intent =
      packageManager
        .getLaunchIntentForPackage(
          packageName
        )
        ?: return

    intent.addFlags(
      Intent.FLAG_ACTIVITY_NEW_TASK or
        Intent.FLAG_ACTIVITY_SINGLE_TOP
    )

    try {
      startActivity(
        intent
      )
    }
    catch (
      ignored: Throwable
    ) {
    }
  }

  private fun startCharacterAnimation(
    characterId: String,
    walking: Boolean
  ) {
    animationHandler.removeCallbacks(
      animationRunnable
    )

    animatedCharacterId =
      characterId
    happyAnimationActive = false
    happyAnimationStep = 0
    touchAnimationActive = false
    touchAnimationStep = 0
    quietSleepForced = false
    walkingAnimationActive =
      walking
    behaviorAnimationMode =
      if (walking) {
        BehaviorAnimationMode.WALK
      }
      else {
        BehaviorAnimationMode.IDLE
      }
    behaviorFrameIndex = 0
    animationFrameIndex = 0

    if (walking) {
      naturalSleepStartedAt = 0L
      behaviorHandler.removeCallbacks(
        behaviorStateRunnable
      )
    }
    else {
      stationarySinceAt =
        SystemClock.uptimeMillis()
      naturalSleepStartedAt = 0L
      scheduleBehaviorStateCheck()
    }

    val frames =
      if (walking) {
        walkDrawableFramesForCharacter(
          characterId
        )
      }
      else {
        drawableFramesForCharacter(
          characterId
        )
      }

    overlayView
      ?.setImageResource(
        frames[
          0
        ]
      )

    animationHandler.postDelayed(
      animationRunnable,
      if (walking) {
        WALK_FRAME_DURATION_MS
      }
      else {
        IDLE_FRAME_DURATION_MS
      }
    )
  }

  private fun startIdleAnimation(
    characterId: String
  ) {
    startCharacterAnimation(
      characterId,
      walking = false
    )
  }

  private fun startWalkAnimation(
    characterId: String
  ) {
    startCharacterAnimation(
      characterId,
      walking = true
    )
  }

  private fun setMovementAnimation(
    walking: Boolean
  ) {
    if (
      happyAnimationActive ||
      touchAnimationActive
    ) {
      return
    }

    if (
      walkingAnimationActive ==
      walking
    ) {
      return
    }

    if (walking) {
      startWalkAnimation(
        animatedCharacterId
      )
    }
    else {
      startIdleAnimation(
        animatedCharacterId
      )
    }
  }

  private fun startSitAnimation(
    preserveStationaryTime: Boolean
  ) {
    if (
      happyAnimationActive ||
      touchAnimationActive ||
      walkingAnimationActive
    ) {
      return
    }

    animationHandler.removeCallbacks(
      animationRunnable
    )

    if (!preserveStationaryTime) {
      stationarySinceAt =
        SystemClock.uptimeMillis()
    }

    behaviorAnimationMode =
      BehaviorAnimationMode.SIT
    behaviorFrameIndex = 1
    naturalSleepStartedAt = 0L

    overlayView
      ?.setImageResource(
        sitDrawableFramesForCharacter(
          animatedCharacterId
        )[
          0
        ]
      )

    animationHandler.postDelayed(
      animationRunnable,
      SIT_FRAME_DURATION_MS
    )
  }

  private fun startSleepAnimation(
    forcedByQuiet: Boolean,
    preserveStationaryTime: Boolean
  ) {
    if (
      happyAnimationActive ||
      touchAnimationActive ||
      walkingAnimationActive
    ) {
      return
    }

    animationHandler.removeCallbacks(
      animationRunnable
    )

    if (!preserveStationaryTime) {
      stationarySinceAt =
        SystemClock.uptimeMillis()
    }

    behaviorAnimationMode =
      BehaviorAnimationMode.SLEEP
    behaviorFrameIndex = 1
    naturalSleepStartedAt =
      SystemClock.uptimeMillis()
    quietSleepForced =
      forcedByQuiet

    overlayView
      ?.setImageResource(
        sleepDrawableFramesForCharacter(
          animatedCharacterId
        )[
          0
        ]
      )

    animationHandler.postDelayed(
      animationRunnable,
      SLEEP_FRAME_DURATION_MS
    )

    scheduleBehaviorStateCheck()
  }

  private fun startTouchAnimation(
    characterId: String
  ) {
    animationHandler.removeCallbacks(
      animationRunnable
    )

    animatedCharacterId =
      characterId
    happyAnimationActive = false
    happyAnimationStep = 0
    walkingAnimationActive = false
    quietSleepForced = false
    behaviorAnimationMode =
      BehaviorAnimationMode.TOUCH
    behaviorFrameIndex = 0
    touchAnimationActive = true
    touchAnimationStep = 1

    overlayView
      ?.setImageResource(
        touchDrawableFramesForCharacter(
          characterId
        )[
          0
        ]
      )

    animationHandler.postDelayed(
      animationRunnable,
      TOUCH_FRAME_DURATION_MS
    )
  }

  private fun stopIdleAnimation() {
    animationHandler.removeCallbacks(
      animationRunnable
    )
    animationFrameIndex = 0
    walkingAnimationActive = false
    happyAnimationActive = false
    happyAnimationStep = 0
    touchAnimationActive = false
    touchAnimationStep = 0
    behaviorAnimationMode =
      BehaviorAnimationMode.IDLE
    behaviorFrameIndex = 0
    naturalSleepStartedAt = 0L
    quietSleepForced = false
    behaviorHandler.removeCallbacks(
      behaviorStateRunnable
    )
  }

  private fun removeOverlay() {
    stabilityHandler.removeCallbacks(
      displayReconcileRunnable
    )
    behaviorHandler.removeCallbacks(
      behaviorStateRunnable
    )
    quietHandler.removeCallbacks(
      quietCheckRunnable
    )
    stopIdleAnimation()
    stopAutoMoveLoop()
    speechHandler.removeCallbacks(
      retryCompletionReactionRunnable
    )
    speechHandler.removeCallbacks(
      finishCompletionReactionRunnable
    )
    speechHandler.removeCallbacks(
      retryLifestyleReactionRunnable
    )
    speechHandler.removeCallbacks(
      finishLifestyleReactionRunnable
    )
    completionQueue.clear()
    completionReactionActive = false
    lifestyleReactionQueue.clear()
    lifestyleReactionActive = false
    speechHandler.removeCallbacksAndMessages(
      null
    )
    hideSpeechBubble()
    hideActionMenu()

    val view =
      overlayView

    if (view != null) {
      try {
        windowManager.removeView(
          view
        )
      }
      catch (
        ignored: Throwable
      ) {
      }
    }

    overlayView = null
    overlayParams = null
  }

  private fun drawableForCharacter(
    characterId: String
  ): Int =
    drawableFramesForCharacter(
      characterId
    )[
      0
    ]

  private fun drawableFramesForCharacter(
    characterId: String
  ): IntArray =
    when (characterId) {
      "moru" ->
        intArrayOf(
          R.drawable.root_character_moru,
          R.drawable.root_character_moru_idle_02,
          R.drawable.root_character_moru_idle_03,
          R.drawable.root_character_moru_idle_04
        )
      "mongsil" ->
        intArrayOf(
          R.drawable.root_character_mongsil,
          R.drawable.root_character_mongsil_idle_02,
          R.drawable.root_character_mongsil_idle_03,
          R.drawable.root_character_mongsil_idle_04
        )
      "dami" ->
        intArrayOf(
          R.drawable.root_character_dami,
          R.drawable.root_character_dami_idle_02,
          R.drawable.root_character_dami_idle_03,
          R.drawable.root_character_dami_idle_04
        )
      "pio" ->
        intArrayOf(
          R.drawable.root_character_pio,
          R.drawable.root_character_pio_idle_02,
          R.drawable.root_character_pio_idle_03,
          R.drawable.root_character_pio_idle_04
        )
      "nuri" ->
        intArrayOf(
          R.drawable.root_character_nuri,
          R.drawable.root_character_nuri_idle_02,
          R.drawable.root_character_nuri_idle_03,
          R.drawable.root_character_nuri_idle_04
        )
      "tori" ->
        intArrayOf(
          R.drawable.root_character_tori,
          R.drawable.root_character_tori_idle_02,
          R.drawable.root_character_tori_idle_03,
          R.drawable.root_character_tori_idle_04
        )
      else ->
        intArrayOf(
          R.drawable.root_character_rooty,
          R.drawable.root_character_rooty_idle_02,
          R.drawable.root_character_rooty_idle_03,
          R.drawable.root_character_rooty_idle_04
        )
    }

  // CHARACTER_V101D_NATIVE_WALK_FRAMES
  private fun walkDrawableFramesForCharacter(
    characterId: String
  ): IntArray =
    when (characterId) {
      "moru" ->
        intArrayOf(
          R.drawable.root_character_moru_walk_01,
          R.drawable.root_character_moru_walk_02,
          R.drawable.root_character_moru_walk_03,
          R.drawable.root_character_moru_walk_04
        )
      "mongsil" ->
        intArrayOf(
          R.drawable.root_character_mongsil_walk_01,
          R.drawable.root_character_mongsil_walk_02,
          R.drawable.root_character_mongsil_walk_03,
          R.drawable.root_character_mongsil_walk_04
        )
      "dami" ->
        intArrayOf(
          R.drawable.root_character_dami_walk_01,
          R.drawable.root_character_dami_walk_02,
          R.drawable.root_character_dami_walk_03,
          R.drawable.root_character_dami_walk_04
        )
      "pio" ->
        intArrayOf(
          R.drawable.root_character_pio_walk_01,
          R.drawable.root_character_pio_walk_02,
          R.drawable.root_character_pio_walk_03,
          R.drawable.root_character_pio_walk_04
        )
      "nuri" ->
        intArrayOf(
          R.drawable.root_character_nuri_walk_01,
          R.drawable.root_character_nuri_walk_02,
          R.drawable.root_character_nuri_walk_03,
          R.drawable.root_character_nuri_walk_04
        )
      "tori" ->
        intArrayOf(
          R.drawable.root_character_tori_walk_01,
          R.drawable.root_character_tori_walk_02,
          R.drawable.root_character_tori_walk_03,
          R.drawable.root_character_tori_walk_04
        )
      else ->
        intArrayOf(
          R.drawable.root_character_rooty_walk_01,
          R.drawable.root_character_rooty_walk_02,
          R.drawable.root_character_rooty_walk_03,
          R.drawable.root_character_rooty_walk_04
        )
    }


  // CHARACTER_V101F_NATIVE_HAPPY_FRAMES
  private fun happyDrawableFramesForCharacter(
    characterId: String
  ): IntArray =
    when (characterId) {
      "moru" ->
        intArrayOf(
          R.drawable.root_character_moru_happy_01,
          R.drawable.root_character_moru_happy_02,
          R.drawable.root_character_moru_happy_03
        )
      "mongsil" ->
        intArrayOf(
          R.drawable.root_character_mongsil_happy_01,
          R.drawable.root_character_mongsil_happy_02,
          R.drawable.root_character_mongsil_happy_03
        )
      "dami" ->
        intArrayOf(
          R.drawable.root_character_dami_happy_01,
          R.drawable.root_character_dami_happy_02,
          R.drawable.root_character_dami_happy_03
        )
      "pio" ->
        intArrayOf(
          R.drawable.root_character_pio_happy_01,
          R.drawable.root_character_pio_happy_02,
          R.drawable.root_character_pio_happy_03
        )
      "nuri" ->
        intArrayOf(
          R.drawable.root_character_nuri_happy_01,
          R.drawable.root_character_nuri_happy_02,
          R.drawable.root_character_nuri_happy_03
        )
      "tori" ->
        intArrayOf(
          R.drawable.root_character_tori_happy_01,
          R.drawable.root_character_tori_happy_02,
          R.drawable.root_character_tori_happy_03
        )
      else ->
        intArrayOf(
          R.drawable.root_character_rooty_happy_01,
          R.drawable.root_character_rooty_happy_02,
          R.drawable.root_character_rooty_happy_03
        )
    }

  // CHARACTER_V101J_NATIVE_SIT_FRAMES
  private fun sitDrawableFramesForCharacter(
    characterId: String
  ): IntArray =
    when (characterId) {
      "moru" ->
        intArrayOf(
          R.drawable.root_character_moru_sit_01,
          R.drawable.root_character_moru_sit_02,
          R.drawable.root_character_moru_sit_03,
          R.drawable.root_character_moru_sit_04
        )
      "mongsil" ->
        intArrayOf(
          R.drawable.root_character_mongsil_sit_01,
          R.drawable.root_character_mongsil_sit_02,
          R.drawable.root_character_mongsil_sit_03,
          R.drawable.root_character_mongsil_sit_04
        )
      "dami" ->
        intArrayOf(
          R.drawable.root_character_dami_sit_01,
          R.drawable.root_character_dami_sit_02,
          R.drawable.root_character_dami_sit_03,
          R.drawable.root_character_dami_sit_04
        )
      "pio" ->
        intArrayOf(
          R.drawable.root_character_pio_sit_01,
          R.drawable.root_character_pio_sit_02,
          R.drawable.root_character_pio_sit_03,
          R.drawable.root_character_pio_sit_04
        )
      "nuri" ->
        intArrayOf(
          R.drawable.root_character_nuri_sit_01,
          R.drawable.root_character_nuri_sit_02,
          R.drawable.root_character_nuri_sit_03,
          R.drawable.root_character_nuri_sit_04
        )
      "tori" ->
        intArrayOf(
          R.drawable.root_character_tori_sit_01,
          R.drawable.root_character_tori_sit_02,
          R.drawable.root_character_tori_sit_03,
          R.drawable.root_character_tori_sit_04
        )
      else ->
        intArrayOf(
          R.drawable.root_character_rooty_sit_01,
          R.drawable.root_character_rooty_sit_02,
          R.drawable.root_character_rooty_sit_03,
          R.drawable.root_character_rooty_sit_04
        )
    }

  // CHARACTER_V101J_NATIVE_SLEEP_FRAMES
  private fun sleepDrawableFramesForCharacter(
    characterId: String
  ): IntArray =
    when (characterId) {
      "moru" ->
        intArrayOf(
          R.drawable.root_character_moru_sleep_01,
          R.drawable.root_character_moru_sleep_02,
          R.drawable.root_character_moru_sleep_03,
          R.drawable.root_character_moru_sleep_04,
          R.drawable.root_character_moru_sleep_05
        )
      "mongsil" ->
        intArrayOf(
          R.drawable.root_character_mongsil_sleep_01,
          R.drawable.root_character_mongsil_sleep_02,
          R.drawable.root_character_mongsil_sleep_03,
          R.drawable.root_character_mongsil_sleep_04,
          R.drawable.root_character_mongsil_sleep_05
        )
      "dami" ->
        intArrayOf(
          R.drawable.root_character_dami_sleep_01,
          R.drawable.root_character_dami_sleep_02,
          R.drawable.root_character_dami_sleep_03,
          R.drawable.root_character_dami_sleep_04,
          R.drawable.root_character_dami_sleep_05
        )
      "pio" ->
        intArrayOf(
          R.drawable.root_character_pio_sleep_01,
          R.drawable.root_character_pio_sleep_02,
          R.drawable.root_character_pio_sleep_03,
          R.drawable.root_character_pio_sleep_04,
          R.drawable.root_character_pio_sleep_05
        )
      "nuri" ->
        intArrayOf(
          R.drawable.root_character_nuri_sleep_01,
          R.drawable.root_character_nuri_sleep_02,
          R.drawable.root_character_nuri_sleep_03,
          R.drawable.root_character_nuri_sleep_04,
          R.drawable.root_character_nuri_sleep_05
        )
      "tori" ->
        intArrayOf(
          R.drawable.root_character_tori_sleep_01,
          R.drawable.root_character_tori_sleep_02,
          R.drawable.root_character_tori_sleep_03,
          R.drawable.root_character_tori_sleep_04,
          R.drawable.root_character_tori_sleep_05
        )
      else ->
        intArrayOf(
          R.drawable.root_character_rooty_sleep_01
        )
    }

  // CHARACTER_V101J_NATIVE_TOUCH_FRAMES
  private fun touchDrawableFramesForCharacter(
    characterId: String
  ): IntArray =
    when (characterId) {
      "moru" ->
        intArrayOf(
          R.drawable.root_character_moru_touch_01,
          R.drawable.root_character_moru_touch_02
        )
      "mongsil" ->
        intArrayOf(
          R.drawable.root_character_mongsil_touch_01,
          R.drawable.root_character_mongsil_touch_02
        )
      "dami" ->
        intArrayOf(
          R.drawable.root_character_dami_touch_01,
          R.drawable.root_character_dami_touch_02
        )
      "pio" ->
        intArrayOf(
          R.drawable.root_character_pio_touch_01,
          R.drawable.root_character_pio_touch_02
        )
      "nuri" ->
        intArrayOf(
          R.drawable.root_character_nuri_touch_01,
          R.drawable.root_character_nuri_touch_02
        )
      "tori" ->
        intArrayOf(
          R.drawable.root_character_tori_touch_01,
          R.drawable.root_character_tori_touch_02
        )
      else ->
        intArrayOf(
          R.drawable.root_character_rooty_happy_01,
          R.drawable.root_character_rooty_happy_02
        )
    }

  private fun scaledWidth(
    scale: Float
  ): Int =
    (
      dp(
        BASE_WIDTH_DP
      ) *
        scale
    ).toInt()
      .coerceAtLeast(
        1
      )

  private fun scaledHeight(
    scale: Float
  ): Int =
    (
      dp(
        BASE_HEIGHT_DP
      ) *
        scale
    ).toInt()
      .coerceAtLeast(
        1
      )

  private fun dp(
    value: Int
  ): Int =
    (
      value *
        resources.displayMetrics.density
    ).toInt()
}
