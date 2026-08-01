package com.cwoos311.rootappnew

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

class RootCardNotificationService :
  NotificationListenerService() {

  companion object {
    private const val TAG =
      "ROOT_CARD_NOTIFICATION"

    /*
     * 첫 테스트에서는 실제 카드사 앱의
     * packageName을 모르기 때문에
     * false로 둡니다.
     *
     * 실제 packageName을 확인한 뒤
     * true로 변경합니다.
     */
    private const val USE_PACKAGE_FILTER =
      false

    /*
     * 아래 패키지 이름은 예시가 아닙니다.
     * 실제 휴대폰 로그에서 확인한 값만
     * 직접 넣어야 합니다.
     */
    private val ALLOWED_PACKAGES =
      setOf<String>(
        // "실제.카드사.패키지명"
      )

    private val PAYMENT_KEYWORDS =
  listOf(
    "승인",
    "결제",
    "결제완료",
    "사용",
    "일시불",
    "할부",
    "체크카드",
    "신용카드",
    "충전",
    "승인취소",
    "결제취소"
  )

    private val EXCLUDED_KEYWORDS =
  listOf(
    "광고",
    "이벤트",
    "쿠폰",
    "로그인",
    "인증번호",
    "보안",
    "명세서"
  )
  }

  override fun onNotificationPosted(
    sbn: StatusBarNotification?
  ) {

    Log.d(
    "ROOT_CARD_NOTIFICATION",
    "NOTIFICATION RECEIVED"
)

    super.onNotificationPosted(sbn)

    if (sbn == null) {
      return
    }

    try {
      val packageName =
        sbn.packageName.orEmpty()

      /*
       * ROOT가 직접 발생시킨 알림은
       * 읽지 않습니다.
       */
      if (
        packageName ==
        applicationContext.packageName
      ) {
        return
      }

      if (
        USE_PACKAGE_FILTER &&
        !ALLOWED_PACKAGES.contains(
          packageName
        )
      ) {
        return
      }

      val extras =
        sbn.notification.extras

      val title =
        extras.getCharSequence(
          Notification.EXTRA_TITLE
        )
          ?.toString()
          ?.trim()
          .orEmpty()

      val normalText =
        extras.getCharSequence(
          Notification.EXTRA_TEXT
        )
          ?.toString()
          ?.trim()
          .orEmpty()

      val bigText =
        extras.getCharSequence(
          Notification.EXTRA_BIG_TEXT
        )
          ?.toString()
          ?.trim()
          .orEmpty()

      /*
       * 일부 알림은 EXTRA_TEXT_LINES에
       * 여러 줄로 들어옵니다.
       */
      val textLines =
        extras.getCharSequenceArray(
          Notification.EXTRA_TEXT_LINES
        )
          ?.map {
            it.toString().trim()
          }
          ?.filter {
            it.isNotBlank()
          }
          ?.joinToString("\n")
          .orEmpty()

      val text =
        listOf(
          bigText,
          textLines,
          normalText
        )
          .firstOrNull {
            it.isNotBlank()
          }
          .orEmpty()

      if (
        title.isBlank() &&
        text.isBlank()
      ) {
        return
      }

      val combinedText =
        "$title\n$text"

      if (
        EXCLUDED_KEYWORDS.any {
          combinedText.contains(
            it,
            ignoreCase = true
          )
        }
      ) {
        return
      }

      val looksLikePayment =
        PAYMENT_KEYWORDS.any {
          combinedText.contains(
            it,
            ignoreCase = true
          )
        }

      /*
       * 금액 표현도 함께 확인합니다.
       */
      val containsWonAmount =
        Regex(
          """(?:₩\s*)?\d{1,3}(?:,\d{3})*\s*원"""
        ).containsMatchIn(
          combinedText
        )

      if (
        !looksLikePayment ||
        !containsWonAmount
      ) {
        return
      }

      val added =
        RootCardNotificationStore.add(
          context =
            applicationContext,

          packageName =
            packageName,

          title =
            title,

          text =
            text,

          postedAt =
            sbn.postTime
        )

      /*
       * 개인정보가 담긴 알림 원문은
       * 로그로 출력하지 않습니다.
       */
      Log.d(
        TAG,
        "captured=" +
          added +
          ", package=" +
          packageName
      )
    } catch (
      exception: Exception
    ) {
      Log.e(
        TAG,
        "notification processing failed",
        exception
      )
    }
  }
}