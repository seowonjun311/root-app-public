package com.cwoos311.rootappnew

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.security.MessageDigest
import java.util.UUID

object RootCardNotificationStore {

  private const val PREFS_NAME =
    "root_card_notification_store"

  private const val KEY_PENDING =
    "pending_notifications"

  private const val MAX_ITEMS =
    100

  private fun getPreferences(
    context: Context
  ) =
    context.getSharedPreferences(
      PREFS_NAME,
      Context.MODE_PRIVATE
    )

  private fun createFingerprint(
    packageName: String,
    title: String,
    text: String,
    postedAt: Long
  ): String {
    /*
     * 같은 알림이 몇 초 차이로
     * 업데이트되는 경우를 줄이기 위해
     * 10초 단위로 묶습니다.
     */
    val roundedTime =
      postedAt / 10_000L

    val source =
      listOf(
        packageName.trim(),
        title.trim(),
        text.trim(),
        roundedTime.toString()
      ).joinToString("|")

    val digest =
      MessageDigest
        .getInstance("SHA-256")
        .digest(
          source.toByteArray(
            Charsets.UTF_8
          )
        )

    return digest.joinToString("") {
      "%02x".format(it)
    }
  }

  @Synchronized
  fun add(
    context: Context,
    packageName: String,
    title: String,
    text: String,
    postedAt: Long
  ): Boolean {
    val fingerprint =
      createFingerprint(
        packageName = packageName,
        title = title,
        text = text,
        postedAt = postedAt
      )

    val current =
      getAll(context)

    /*
     * 이미 같은 알림이 있으면
     * 다시 저장하지 않습니다.
     */
    for (
      index in
      0 until current.length()
    ) {
      val existing =
        current.optJSONObject(index)
          ?: continue

      if (
        existing.optString(
          "fingerprint"
        ) == fingerprint
      ) {
        return false
      }
    }

    val item =
      JSONObject().apply {
        put(
          "id",
          UUID.randomUUID().toString()
        )

        put(
          "packageName",
          packageName
        )

        put(
          "title",
          title
        )

        put(
          "text",
          text
        )

        put(
          "postedAt",
          postedAt
        )

        put(
          "receivedAt",
          System.currentTimeMillis()
        )

        put(
          "fingerprint",
          fingerprint
        )
      }

    val updated =
      JSONArray()

    /*
     * 최신 알림을 앞쪽에 저장합니다.
     */
    updated.put(item)

    val previousLimit =
      minOf(
        current.length(),
        MAX_ITEMS - 1
      )

    for (
      index in
      0 until previousLimit
    ) {
      updated.put(
        current.get(index)
      )
    }

    getPreferences(context)
      .edit()
      .putString(
        KEY_PENDING,
        updated.toString()
      )
      .apply()

    return true
  }

  @Synchronized
  fun getAll(
    context: Context
  ): JSONArray {
    val raw =
      getPreferences(context)
        .getString(
          KEY_PENDING,
          "[]"
        )
        ?: "[]"

    return try {
      JSONArray(raw)
    } catch (
      exception: Exception
    ) {
      JSONArray()
    }
  }

  @Synchronized
  fun remove(
    context: Context,
    fingerprint: String
  ) {
    val current =
      getAll(context)

    val updated =
      JSONArray()

    for (
      index in
      0 until current.length()
    ) {
      val item =
        current.optJSONObject(index)
          ?: continue

      if (
        item.optString(
          "fingerprint"
        ) != fingerprint
      ) {
        updated.put(item)
      }
    }

    getPreferences(context)
      .edit()
      .putString(
        KEY_PENDING,
        updated.toString()
      )
      .apply()
  }

  @Synchronized
  fun clear(
    context: Context
  ) {
    getPreferences(context)
      .edit()
      .remove(
        KEY_PENDING
      )
      .apply()
  }
}