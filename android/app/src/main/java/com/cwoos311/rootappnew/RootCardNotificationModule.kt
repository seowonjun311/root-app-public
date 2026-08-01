package com.cwoos311.rootappnew

import android.app.NotificationManager
import android.content.ComponentName
import android.content.Intent
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class RootCardNotificationModule(
  reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(
  reactContext
) {

  override fun getName():
    String {
    return "RootCardNotificationModule"
  }

  @ReactMethod
  fun openNotificationAccessSettings() {
    val context =
      reactApplicationContext

    val intent =
      Intent(
        Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS
      ).apply {
        addFlags(
          Intent.FLAG_ACTIVITY_NEW_TASK
        )
      }

    context.startActivity(intent)
  }

  @ReactMethod
  fun hasNotificationAccess(
    promise: Promise
  ) {
    try {
      val context =
        reactApplicationContext

      val manager =
        context.getSystemService(
          NotificationManager::class.java
        )

      val component =
        ComponentName(
          context,
          RootCardNotificationService::class.java
        )

      val granted =
        manager
          .isNotificationListenerAccessGranted(
            component
          )

      promise.resolve(granted)
    } catch (
      exception: Exception
    ) {
      promise.reject(
        "CARD_ACCESS_CHECK_FAILED",
        exception
      )
    }
  }

  @ReactMethod
  fun getPendingNotifications(
    promise: Promise
  ) {
    try {
      val json =
        RootCardNotificationStore
          .getAll(
            reactApplicationContext
          )
          .toString()

      promise.resolve(json)
    } catch (
      exception: Exception
    ) {
      promise.reject(
        "CARD_PENDING_READ_FAILED",
        exception
      )
    }
  }

  @ReactMethod
  fun removePendingNotification(
    fingerprint: String,
    promise: Promise
  ) {
    try {
      RootCardNotificationStore.remove(
        context =
          reactApplicationContext,

        fingerprint =
          fingerprint
      )

      promise.resolve(true)
    } catch (
      exception: Exception
    ) {
      promise.reject(
        "CARD_PENDING_REMOVE_FAILED",
        exception
      )
    }
  }

  @ReactMethod
  fun clearPendingNotifications(
    promise: Promise
  ) {
    try {
      RootCardNotificationStore.clear(
        reactApplicationContext
      )

      promise.resolve(true)
    } catch (
      exception: Exception
    ) {
      promise.reject(
        "CARD_PENDING_CLEAR_FAILED",
        exception
      )
    }
  }
}