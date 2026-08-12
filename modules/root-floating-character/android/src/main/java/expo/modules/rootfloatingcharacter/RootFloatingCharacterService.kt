package expo.modules.rootfloatingcharacter

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
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
    private const val ACTION_SET_GOAL_SNAPSHOT = "root.floating.SET_GOAL_SNAPSHOT"
    private const val ACTION_SET_GOAL_SPEECH = "root.floating.SET_GOAL_SPEECH"
    private const val ACTION_SHOW_GOAL_SPEECH_NOW = "root.floating.SHOW_GOAL_SPEECH_NOW"
    private const val ACTION_SET_GOAL_COMPLETION_SNAPSHOT = "root.floating.SET_GOAL_COMPLETION_SNAPSHOT"

    private const val EXTRA_CHARACTER_ID = "characterId"
    private const val EXTRA_SCALE = "scale"
    private const val EXTRA_AUTO_MOVE = "autoMoveEnabled"
    private const val EXTRA_GOALS_JSON = "goalsJson"
    private const val EXTRA_GOAL_SPEECH = "goalSpeechEnabled"
    private const val EXTRA_COMPLETIONS_JSON = "completionsJson"

    private const val PREFS = "root_floating_character_v1"
    private const val PREF_CHARACTER_ID = "characterId"
    private const val PREF_X = "x"
    private const val PREF_Y = "y"
    private const val PREF_SCALE = "scale"
    private const val PREF_AUTO_MOVE = "autoMoveEnabled"
    private const val PREF_GOALS_JSON = "goalSnapshotJson"
    private const val PREF_GOAL_SPEECH = "goalSpeechEnabled"
    private const val PREF_LAST_GOAL_ID = "lastSpokenGoalId"
    private const val PREF_LAST_GOAL_AT = "lastSpokenGoalAt"
    private const val PREF_COMPLETIONS_JSON = "goalCompletionSnapshotJson"
    private const val PREF_COMPLETION_BASELINE_READY = "goalCompletionBaselineReady"
    private const val PREF_CELEBRATED_COMPLETION_KEYS = "celebratedGoalCompletionKeys"

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
    private const val COMPLETION_SPEECH_DISPLAY_MS = 5000L
    private const val COMPLETION_QUEUE_GAP_MS = 450L
    private const val COMPLETION_BUSY_RETRY_MS = 500L

    private const val BASE_WIDTH_DP = 118
    private const val BASE_HEIGHT_DP = 176
    private const val MIN_SCALE = 0.60f
    private const val MAX_SCALE = 1.60f
    private const val DEFAULT_SCALE = 1.00f

    @Volatile
    var isRunning: Boolean = false
      private set

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

  private var overlayView: ImageView? = null
  private var overlayParams: WindowManager.LayoutParams? = null

  // CHARACTER_V101B_NATIVE_IDLE_ANIMATION
  private val animationHandler =
    Handler(
      Looper.getMainLooper()
    )

  private var animatedCharacterId = "rooty"
  private var animationFrameIndex = 0
  private var walkingAnimationActive = false

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
            animationFrameIndex = 0

            val idleFrames =
              drawableFramesForCharacter(
                animatedCharacterId
              )

            view.setImageResource(
              idleFrames[
                0
              ]
            )

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

  private val motionRunnable =
    object : Runnable {
      override fun run() {
        val view =
          overlayView
            ?: return
        val params =
          overlayParams
            ?: return

        if (!autoMoveEnabled) {
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
          now < autoMoveResumeAt ||
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
        goalSpeechEnabled &&
        pendingGoals.isNotEmpty()
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
          !goalSpeechEnabled ||
          pendingGoals.isEmpty() ||
          overlayView == null
        ) {
          return
        }

        if (
          userInteracting ||
          walkingAnimationActive ||
          completionReactionActive ||
          completionQueue.isNotEmpty() ||
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

    windowManager =
      getSystemService(
        WINDOW_SERVICE
      ) as WindowManager

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

    createNotificationChannel()
    promoteToForeground()

    isRunning = true
  }

  override fun onStartCommand(
    intent: Intent?,
    flags: Int,
    startId: Int
  ): Int {
    when (intent?.action) {
      ACTION_STOP -> {
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

  override fun onDestroy() {
    removeOverlay()
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

    clampOverlayPosition(
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

  private fun beginUserInteraction() {
    userInteracting = true
    autoTargetX = null
    autoTargetY = null

    if (happyAnimationActive) {
      happyAnimationActive = false
      happyAnimationStep = 0
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

    if (autoMoveEnabled) {
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

    if (!autoMoveEnabled) {
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

    if (enabled) {
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

  private fun chooseAutoMoveTarget(
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

    val radius =
      dp(
        AUTO_MOVE_TARGET_RADIUS_DP
      ).coerceAtLeast(
        1
      )

    autoTargetX =
      (
        params.x +
          Random.nextInt(
            -radius,
            radius + 1
          )
      ).coerceIn(
        0,
        maxX
      )

    autoTargetY =
      (
        params.y +
          Random.nextInt(
            -radius,
            radius + 1
          )
      ).coerceIn(
        0,
        maxY
      )
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
    val editor =
      prefs
        .edit()
        .putFloat(
          PREF_SCALE,
          currentScale
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
  private fun showTapReaction() {
    val reactions =
      arrayOf(
        "응! 여기 있어 😊",
        "오늘도 같이 가자!",
        "불렀어?",
        "조금씩 해도 좋아!"
      )

    setMovementAnimation(
      false
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

    if (pendingGoals.isEmpty()) {
      speechHandler.removeCallbacks(
        goalSpeechRunnable
      )
      return
    }

    if (goalSpeechEnabled) {
      scheduleNextGoalSpeech(
        initial = true
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

    if (pendingGoals.isNotEmpty()) {
      scheduleNextGoalSpeech(
        initial = true
      )
    }
  }

  private fun scheduleNextGoalSpeech(
    initial: Boolean
  ) {
    speechHandler.removeCallbacks(
      goalSpeechRunnable
    )

    if (
      !goalSpeechEnabled ||
      pendingGoals.isEmpty() ||
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
      !goalSpeechEnabled ||
      overlayView == null
    ) {
      return false
    }

    if (pendingGoals.isEmpty()) {
      if (force) {
        showSpeechBubble(
          "오늘 남은 행동목표가 없어!",
          TAP_REACTION_DISPLAY_MS
        )
      }

      return false
    }

    if (
      !force &&
      (
        userInteracting ||
        walkingAnimationActive ||
        completionReactionActive ||
        completionQueue.isNotEmpty() ||
        actionMenuView != null
      )
    ) {
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
      when (
        Random.nextInt(
          4
        )
      ) {
        0 ->
          "오늘 '${goal.second}' 아직 남아 있어!"
        1 ->
          "'${goal.second}'도 같이 해볼까?"
        2 ->
          "오늘 '${goal.second}' 잊지 않았지?"
        else ->
          "'${goal.second}' 조금만 해도 좋아!"
      }

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
    if (
      completionReactionActive ||
      completionQueue.isEmpty() ||
      overlayView == null
    ) {
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
      goalSpeechRunnable
    )
    speechHandler.removeCallbacks(
      finishCompletionReactionRunnable
    )
    hideActionMenu()
    hideSpeechBubble()

    val message =
      when (
        Random.nextInt(
          4
        )
      ) {
        0 ->
          "'${completion.title}' 완료했네! 수고했어!"
        1 ->
          "오늘 목표 하나 더 끝냈다! '${completion.title}' 완료!"
        2 ->
          "좋아! '${completion.title}' 해냈네!"
        else ->
          "완료! '${completion.title}' 정말 잘했어!"
      }

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
    walkingAnimationActive =
      walking
    animationFrameIndex = 0

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
    if (happyAnimationActive) {
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

  private fun stopIdleAnimation() {
    animationHandler.removeCallbacks(
      animationRunnable
    )
    animationFrameIndex = 0
    walkingAnimationActive = false
    happyAnimationActive = false
    happyAnimationStep = 0
  }

  private fun removeOverlay() {
    stopIdleAnimation()
    stopAutoMoveLoop()
    speechHandler.removeCallbacks(
      retryCompletionReactionRunnable
    )
    speechHandler.removeCallbacks(
      finishCompletionReactionRunnable
    )
    completionQueue.clear()
    completionReactionActive = false
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
