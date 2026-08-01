package com.cwoos311.rootappnew

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import org.json.JSONObject

class RootWidgetModule(
  private val reactContext:
    ReactApplicationContext
) : ReactContextBaseJavaModule(
  reactContext
) {

  companion object {
    private const val PREFS_NAME =
      "root_widget_prefs"

    private const val WIDGET_DATA_KEY =
      "root_widget_data"

    private const val SLEEP_START_KEY =
      "widget_sleep_start_at"

    private const val PENDING_SLEEP_KEY =
      "pending_widget_sleep_record"

    private const val SLEEP_NOTIFICATION_ID =
      8802

    private const val SLEEP_CHANNEL_ID =
      "root_sleep_widget"
  }

  override fun getName(): String {
    return "RootWidgetModule"
  }

  private fun getPrefs() =
    reactContext.getSharedPreferences(
      PREFS_NAME,
      Context.MODE_PRIVATE
    )

  private fun readWidgetData(
    rawJson: String?
  ): JSONObject {
    return try {
      if (
        rawJson.isNullOrBlank()
      ) {
        JSONObject()
      } else {
        JSONObject(
          rawJson
        )
      }
    } catch (
      error: Exception
    ) {
      JSONObject()
    }
  }

  private fun updateSleepInWidgetJson(
    rawJson: String?,
    isSleeping: Boolean,
    startedAt: String?
  ): String {
    val data =
      readWidgetData(
        rawJson
      )

    val sleep =
      JSONObject().apply {
        put(
          "isSleeping",
          isSleeping
        )

        if (
          startedAt.isNullOrBlank()
        ) {
          put(
            "startedAt",
            JSONObject.NULL
          )
        } else {
          put(
            "startedAt",
            startedAt
          )
        }
      }

    data.put(
      "sleep",
      sleep
    )

    data.put(
      "updatedAt",
      System.currentTimeMillis()
    )

    return data.toString()
  }

  private fun getSleepStartFromJson(
    rawJson: String?
  ): String? {
    return try {
      if (
        rawJson.isNullOrBlank()
      ) {
        null
      } else {
        val data =
          JSONObject(
            rawJson
          )

        val sleep =
          data.optJSONObject(
            "sleep"
          )

        val startedAt =
          sleep?.optString(
            "startedAt",
            ""
          ) ?: ""

        if (
          startedAt.isBlank() ||
          startedAt == "null"
        ) {
          null
        } else {
          startedAt
        }
      }
    } catch (
      error: Exception
    ) {
      null
    }
  }

  private fun refreshWidget() {
    val appWidgetManager =
      AppWidgetManager.getInstance(
        reactContext
      )

    val componentName =
      ComponentName(
        reactContext,
        RootDayWidgetProvider::class.java
      )

    val appWidgetIds =
      appWidgetManager
        .getAppWidgetIds(
          componentName
        )

    RootDayWidgetProvider()
      .onUpdate(
        reactContext,
        appWidgetManager,
        appWidgetIds
      )
  }

  private fun makeOpenAppPendingIntent():
    PendingIntent {
    val intent =
      Intent(
        reactContext,
        MainActivity::class.java
      ).apply {
        flags =
          Intent.FLAG_ACTIVITY_NEW_TASK or
          Intent.FLAG_ACTIVITY_CLEAR_TOP
      }

    return PendingIntent.getActivity(
      reactContext,
      "open_root_app".hashCode(),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or
        PendingIntent.FLAG_IMMUTABLE
    )
  }

  private fun showSleepNotification() {
    if (
      Build.VERSION.SDK_INT >= 33 &&
      ContextCompat.checkSelfPermission(
        reactContext,
        Manifest.permission
          .POST_NOTIFICATIONS
      ) !=
      PackageManager
        .PERMISSION_GRANTED
    ) {
      return
    }

    val manager =
      reactContext.getSystemService(
        Context.NOTIFICATION_SERVICE
      ) as NotificationManager

    if (
      Build.VERSION.SDK_INT >=
      Build.VERSION_CODES.O
    ) {
      val channel =
        NotificationChannel(
          SLEEP_CHANNEL_ID,
          "루트 수면 기록",
          NotificationManager
            .IMPORTANCE_HIGH
        )

      manager.createNotificationChannel(
        channel
      )
    }

    val notification =
      NotificationCompat.Builder(
        reactContext,
        SLEEP_CHANNEL_ID
      )
        .setSmallIcon(
          R.mipmap.ic_launcher
        )
        .setContentTitle(
          "🌙 루트 수면 기록 중"
        )
        .setContentText(
          "수면이 기록되고 있어요."
        )
        .setOngoing(
          true
        )
        .setAutoCancel(
          false
        )
        .setContentIntent(
          makeOpenAppPendingIntent()
        )
        .setPriority(
          NotificationCompat
            .PRIORITY_HIGH
        )
        .build()

    manager.notify(
      SLEEP_NOTIFICATION_ID,
      notification
    )
  }

  private fun cancelNativeSleepNotification() {
    val manager =
      reactContext.getSystemService(
        Context.NOTIFICATION_SERVICE
      ) as NotificationManager

    manager.cancel(
      SLEEP_NOTIFICATION_ID
    )
  }

  @ReactMethod
  fun updateWidgetData(
    json: String
  ) {
    getPrefs()
      .edit()
      .putString(
        WIDGET_DATA_KEY,
        json
      )
      .apply()

    refreshWidget()
  }

  /*
   * 하루 탭과 위젯이 공통으로 사용할
   * 수면 시작 상태를 만듭니다.
   *
   * 이미 시작된 수면이 있으면
   * 기존 시작 시간을 그대로 반환합니다.
   */
  @ReactMethod
  fun startWidgetSleep(
    requestedStartAt: String?,
    promise: Promise
  ) {
    try {
      val prefs =
        getPrefs()

      val currentStartAt =
        prefs.getString(
          SLEEP_START_KEY,
          null
        )

      val actualStartAt =
        when {
          !currentStartAt
            .isNullOrBlank() -> {
            currentStartAt
          }

          !requestedStartAt
            .isNullOrBlank() -> {
            requestedStartAt
          }

          else -> {
            System.currentTimeMillis()
              .toString()
          }
        }

      val rawWidgetData =
        prefs.getString(
          WIDGET_DATA_KEY,
          null
        )

      prefs.edit()
        .putString(
          SLEEP_START_KEY,
          actualStartAt
        )
        .putString(
          WIDGET_DATA_KEY,
          updateSleepInWidgetJson(
            rawWidgetData,
            true,
            actualStartAt
          )
        )
        .remove(
          PENDING_SLEEP_KEY
        )
        .apply()

      showSleepNotification()

      refreshWidget()

      promise.resolve(
        actualStartAt
      )
    } catch (
      error: Exception
    ) {
      promise.reject(
        "START_WIDGET_SLEEP_ERROR",
        error
      )
    }
  }

  /*
   * 하루 탭에서 수면을 끝낼 때
   * 위젯의 공통 수면 상태를 종료합니다.
   *
   * 이 함수는 완료 기록을 새로 만들지 않고,
   * 시작 시간만 반환합니다.
   */
  @ReactMethod
  fun stopWidgetSleepState(
    promise: Promise
  ) {
    try {
      val prefs =
        getPrefs()

      val rawWidgetData =
        prefs.getString(
          WIDGET_DATA_KEY,
          null
        )

      val startAtFromPrefs =
        prefs.getString(
          SLEEP_START_KEY,
          null
        )

      val startAtFromJson =
        getSleepStartFromJson(
          rawWidgetData
        )

      val actualStartAt =
        if (
          !startAtFromPrefs
            .isNullOrBlank()
        ) {
          startAtFromPrefs
        } else {
          startAtFromJson
        }

      prefs.edit()
        .remove(
          SLEEP_START_KEY
        )
        .remove(
          PENDING_SLEEP_KEY
        )
        .putString(
          WIDGET_DATA_KEY,
          updateSleepInWidgetJson(
            rawWidgetData,
            false,
            null
          )
        )
        .apply()

      cancelNativeSleepNotification()

      refreshWidget()

      promise.resolve(
        actualStartAt
      )
    } catch (
      error: Exception
    ) {
      promise.reject(
        "STOP_WIDGET_SLEEP_ERROR",
        error
      )
    }
  }

  @ReactMethod
  fun getWidgetSleepStartAt(
    promise: Promise
  ) {
    try {
      val prefs =
        getPrefs()

      val startAtFromPrefs =
        prefs.getString(
          SLEEP_START_KEY,
          null
        )

      val startAtFromJson =
        getSleepStartFromJson(
          prefs.getString(
            WIDGET_DATA_KEY,
            null
          )
        )

      val actualStartAt =
        if (
          !startAtFromPrefs
            .isNullOrBlank()
        ) {
          startAtFromPrefs
        } else {
          startAtFromJson
        }

      promise.resolve(
        actualStartAt
      )
    } catch (
      error: Exception
    ) {
      promise.reject(
        "GET_WIDGET_SLEEP_START_ERROR",
        error
      )
    }
  }

  @ReactMethod
  fun consumePendingSleepRecord(
    promise: Promise
  ) {
    try {
      val prefs =
        getPrefs()

      val raw =
        prefs.getString(
          PENDING_SLEEP_KEY,
          null
        )

      if (
        raw.isNullOrBlank()
      ) {
        promise.resolve(
          null
        )

        return
      }

      prefs.edit()
        .remove(
          PENDING_SLEEP_KEY
        )
        .apply()

      promise.resolve(
        raw
      )
    } catch (
      error: Exception
    ) {
      promise.reject(
        "CONSUME_PENDING_SLEEP_ERROR",
        error
      )
    }
  }

  @ReactMethod
  fun cancelWidgetSleepNotification() {
    try {
      cancelNativeSleepNotification()
    } catch (
      error: Exception
    ) {
      /*
       * 알림 취소 실패는
       * 앱 동작을 막지 않습니다.
       */
    }
  }
}