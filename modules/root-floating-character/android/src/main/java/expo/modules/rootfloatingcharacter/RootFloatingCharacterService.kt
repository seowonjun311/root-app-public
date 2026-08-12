package expo.modules.rootfloatingcharacter

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.SystemClock
import android.provider.Settings
import android.view.Gravity
import android.view.MotionEvent
import android.view.ScaleGestureDetector
import android.view.WindowManager
import android.widget.ImageView
import kotlin.math.abs
import kotlin.random.Random

// CHARACTER_V101A_ANDROID_FLOATING_CHARACTER_SERVICE
// CHARACTER_V101C_FLOATING_MOTION_SCALE
// CHARACTER_V101D_WALK_STATE_ANIMATION
class RootFloatingCharacterService : Service() {
  companion object {
    private const val ACTION_START = "root.floating.START"
    private const val ACTION_STOP = "root.floating.STOP"
    private const val ACTION_UPDATE = "root.floating.UPDATE"
    private const val ACTION_SET_SCALE = "root.floating.SET_SCALE"
    private const val ACTION_SET_AUTO_MOVE = "root.floating.SET_AUTO_MOVE"

    private const val EXTRA_CHARACTER_ID = "characterId"
    private const val EXTRA_SCALE = "scale"
    private const val EXTRA_AUTO_MOVE = "autoMoveEnabled"

    private const val PREFS = "root_floating_character_v1"
    private const val PREF_CHARACTER_ID = "characterId"
    private const val PREF_X = "x"
    private const val PREF_Y = "y"
    private const val PREF_SCALE = "scale"
    private const val PREF_AUTO_MOVE = "autoMoveEnabled"

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

  private val animationRunnable =
    object : Runnable {
      override fun run() {
        val view =
          overlayView
            ?: return

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
            setMovementAnimation(
              true
            )

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
              openRootApp()
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
    setMovementAnimation(
      false
    )
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
    }
    catch (
      ignored: Throwable
    ) {
    }
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
  }

  private fun removeOverlay() {
    stopIdleAnimation()
    stopAutoMoveLoop()

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
