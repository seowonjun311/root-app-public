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
import android.provider.Settings
import android.view.Gravity
import android.view.MotionEvent
import android.view.WindowManager
import android.widget.ImageView
import kotlin.math.abs

// CHARACTER_V101A_ANDROID_FLOATING_CHARACTER_SERVICE
class RootFloatingCharacterService :
  Service() {
  companion object {
    private const val ACTION_START =
      "root.floating.START"

    private const val ACTION_STOP =
      "root.floating.STOP"

    private const val ACTION_UPDATE =
      "root.floating.UPDATE"

    private const val EXTRA_CHARACTER_ID =
      "characterId"

    private const val PREFS =
      "root_floating_character_v1"

    private const val PREF_CHARACTER_ID =
      "characterId"

    private const val PREF_X =
      "x"

    private const val PREF_Y =
      "y"

    private const val CHANNEL_ID =
      "root_floating_character"

    private const val NOTIFICATION_ID =
      7101

    private const val IDLE_FRAME_DURATION_MS =
      700L

    @Volatile
    var isRunning:
      Boolean =
      false
      private set

    private fun sanitizeCharacterId(
      characterId:
        String
    ): String {
      return when (
        characterId
      ) {
        "rooty",
        "moru",
        "mongsil",
        "dami",
        "pio",
        "nuri",
        "tori" ->
          characterId

        else ->
          "rooty"
      }
    }

    fun readSelectedCharacter(
      context:
        Context
    ): String {
      return context
        .getSharedPreferences(
          PREFS,
          Context.MODE_PRIVATE
        )
        .getString(
          PREF_CHARACTER_ID,
          "rooty"
        )
        ?: "rooty"
    }

    fun start(
      context:
        Context,
      characterId:
        String
    ) {
      val safeId =
        sanitizeCharacterId(
          characterId
        )

      context
        .getSharedPreferences(
          PREFS,
          Context.MODE_PRIVATE
        )
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
          action =
            ACTION_START

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

    fun stop(
      context:
        Context
    ) {
      val intent =
        Intent(
          context,
          RootFloatingCharacterService::class.java
        ).apply {
          action =
            ACTION_STOP
        }

      context.startService(
        intent
      )
    }

    fun updateCharacter(
      context:
        Context,
      characterId:
        String
    ) {
      val safeId =
        sanitizeCharacterId(
          characterId
        )

      context
        .getSharedPreferences(
          PREFS,
          Context.MODE_PRIVATE
        )
        .edit()
        .putString(
          PREF_CHARACTER_ID,
          safeId
        )
        .apply()

      if (
        !isRunning
      ) {
        return
      }

      val intent =
        Intent(
          context,
          RootFloatingCharacterService::class.java
        ).apply {
          action =
            ACTION_UPDATE

          putExtra(
            EXTRA_CHARACTER_ID,
            safeId
          )
        }

      context.startService(
        intent
      )
    }
  }

  private lateinit var windowManager:
    WindowManager

  private var overlayView:
    ImageView? =
    null

  private var overlayParams:
    WindowManager.LayoutParams? =
    null

  // CHARACTER_V101B_NATIVE_IDLE_ANIMATION
  private val animationHandler =
    Handler(
      Looper.getMainLooper()
    )

  private var animatedCharacterId:
    String =
    "rooty"

  private var animationFrameIndex:
    Int =
    0

  private val animationRunnable =
    object :
      Runnable {
      override fun run() {
        val view =
          overlayView
            ?: return

        val frames =
          drawableFramesForCharacter(
            animatedCharacterId
          )

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

        animationHandler.postDelayed(
          this,
          IDLE_FRAME_DURATION_MS
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

    createNotificationChannel()

    promoteToForeground()

    isRunning =
      true
  }

  override fun onStartCommand(
    intent:
      Intent?,
    flags:
      Int,
    startId:
      Int
  ): Int {
    when (
      intent?.action
    ) {
      ACTION_STOP -> {
        stopSelf()

        return START_NOT_STICKY
      }

      ACTION_UPDATE -> {
        val characterId =
          intent.getStringExtra(
            EXTRA_CHARACTER_ID
          ) ?:
          readSelectedCharacter(
            this
          )

        showOrUpdateOverlay(
          characterId
        )

        return START_STICKY
      }

      else -> {
        val characterId =
          intent
            ?.getStringExtra(
              EXTRA_CHARACTER_ID
            ) ?:
          readSelectedCharacter(
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
    intent:
      Intent?
  ): IBinder? =
    null

  override fun onDestroy() {
    removeOverlay()

    isRunning =
      false

    super.onDestroy()
  }

  override fun onTaskRemoved(
    rootIntent:
      Intent?
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

    val channel =
      NotificationChannel(
        CHANNEL_ID,
        "ROOT 화면 위 캐릭터",
        NotificationManager.IMPORTANCE_LOW
      ).apply {
        description =
          "ROOT 앱을 닫아도 선택한 캐릭터를 화면 위에 표시합니다."
      }

    manager.createNotificationChannel(
      channel
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

  private fun buildNotification():
    Notification {
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

    val stopIntent =
      Intent(
        this,
        RootFloatingCharacterService::class.java
      ).apply {
        action =
          ACTION_STOP
      }

    val stopPendingIntent =
      PendingIntent.getService(
        this,
        7102,
        stopIntent,
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
        "캐릭터를 드래그해서 위치를 옮길 수 있어요."
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

    if (
      contentIntent !==
      null
    ) {
      builder.setContentIntent(
        contentIntent
      )
    }

    return builder.build()
  }

  private fun showOrUpdateOverlay(
    characterId:
      String
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
      when (
        characterId
      ) {
        "rooty",
        "moru",
        "mongsil",
        "dami",
        "pio",
        "nuri",
        "tori" ->
          characterId

        else ->
          "rooty"
      }

    prefs
      .edit()
      .putString(
        PREF_CHARACTER_ID,
        safeId
      )
      .apply()

    val existing =
      overlayView

    if (
      existing !==
      null
    ) {
      startIdleAnimation(
        safeId
      )

      return
    }

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

        adjustViewBounds =
          true

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
        dp(
          118
        ),
        dp(
          176
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

    attachDragAndTap(
      imageView,
      params
    )

    try {
      windowManager.addView(
        imageView,
        params
      )

      overlayView =
        imageView

      overlayParams =
        params

      startIdleAnimation(
        safeId
      )
    }
    catch (
      error:
        Throwable
    ) {
      stopSelf()
    }
  }

  private fun attachDragAndTap(
    imageView:
      ImageView,
    params:
      WindowManager.LayoutParams
  ) {
    var downRawX =
      0f

    var downRawY =
      0f

    var startX =
      0

    var startY =
      0

    imageView.setOnTouchListener {
      _,
      event ->

      when (
        event.actionMasked
      ) {
        MotionEvent.ACTION_DOWN -> {
          downRawX =
            event.rawX

          downRawY =
            event.rawY

          startX =
            params.x

          startY =
            params.y

          true
        }

        MotionEvent.ACTION_MOVE -> {
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

          try {
            windowManager
              .updateViewLayout(
                imageView,
                params
              )
          }
          catch (
            ignored:
              Throwable
          ) {
          }

          true
        }

        MotionEvent.ACTION_UP -> {
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

          true
        }

        else ->
          false
      }
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
      ignored:
        Throwable
    ) {
    }
  }

  private fun startIdleAnimation(
    characterId:
      String
  ) {
    animationHandler.removeCallbacks(
      animationRunnable
    )

    animatedCharacterId =
      characterId

    animationFrameIndex =
      0

    val frames =
      drawableFramesForCharacter(
        characterId
      )

    overlayView
      ?.setImageResource(
        frames[
          0
        ]
      )

    animationHandler.postDelayed(
      animationRunnable,
      IDLE_FRAME_DURATION_MS
    )
  }

  private fun stopIdleAnimation() {
    animationHandler.removeCallbacks(
      animationRunnable
    )

    animationFrameIndex =
      0
  }

  private fun removeOverlay() {
    stopIdleAnimation()

    val view =
      overlayView

    if (
      view !==
      null
    ) {
      try {
        windowManager.removeView(
          view
        )
      }
      catch (
        ignored:
          Throwable
      ) {
      }
    }

    overlayView =
      null

    overlayParams =
      null
  }

  private fun drawableForCharacter(
    characterId:
      String
  ): Int {
    return drawableFramesForCharacter(
      characterId
    )[
      0
    ]
  }

  private fun drawableFramesForCharacter(
    characterId:
      String
  ): IntArray {
    return when (
      characterId
    ) {
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
  }

  private fun dp(
    value:
      Int
  ): Int {
    return (
      value *
      resources.displayMetrics.density
    ).toInt()
  }
}
