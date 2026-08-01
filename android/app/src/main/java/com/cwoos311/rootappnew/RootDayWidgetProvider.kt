package com.cwoos311.rootappnew

import android.Manifest
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import androidx.core.app.NotificationCompat
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class RootDayWidgetProvider : AppWidgetProvider() {

companion object {
  private const val SLEEP_NOTIFICATION_ID = 8802
  private const val SLEEP_CHANNEL_ID = "root_sleep_widget"
}

  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray
  ) {
    for (appWidgetId in appWidgetIds) {
      val views = RemoteViews(
        context.packageName,
        R.layout.root_day_widget
      )

      val intent = Intent(context, MainActivity::class.java).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      }

      val pendingIntent = PendingIntent.getActivity(
        context,
        0,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )

      views.setOnClickPendingIntent(
        R.id.widgetRoot,
        pendingIntent
      )

      val today = SimpleDateFormat(
        "M월 d일 E요일",
        Locale.KOREAN
      ).format(Date())

      views.setTextViewText(
        R.id.widgetDate,
        today
      )

      views.setTextViewText(
        R.id.widgetSleepLabel,
        "수면 🌙"
      )

      views.setTextViewText(
        R.id.widgetSleepButton,
        "시작"
      )

      val prefs = context.getSharedPreferences(
        "root_widget_prefs",
        Context.MODE_PRIVATE
      )

      val json = prefs.getString(
        "root_widget_data",
        null
      )

      val data = try {
        if (json.isNullOrBlank()) {
          JSONObject()
        } else {
          JSONObject(json)
        }
      } catch (e: Exception) {
        JSONObject()
      }

val currentDateKey =
  SimpleDateFormat(
    "yyyy-MM-dd",
    Locale.US
  ).format(Date())

val storedDateKey =
  data.optString(
    "dateKey",
    ""
  )

/*
 * 저장된 위젯 데이터의 날짜와
 * 현재 날짜가 다르면 새로운 날입니다.
 */
val isNewDay =
  storedDateKey.isBlank() ||
  storedDateKey != currentDateKey


val sleep = data.optJSONObject("sleep")
val isSleeping = sleep?.optBoolean("isSleeping", false) ?: false

views.setTextViewText(
  R.id.widgetSleepLabel,
  "수면 🌙"
)

views.setTextViewText(
  R.id.widgetSleepButton,
  if (isSleeping) "기록중" else "시작"
)

views.setOnClickPendingIntent(
  R.id.widgetSleepButton,
  makeSleepBroadcastPendingIntent(
    context,
    if (isSleeping) "finishSleep" else "startSleep"
  )
)



      views.setTextViewText(
        R.id.widgetStudyTitle,
        "📚 공부"
      )

      views.setTextViewText(
        R.id.widgetExerciseTitle,
        "👟 운동"
      )

      views.setTextViewText(
        R.id.widgetMentalTitle,
        "🧘 정신"
      )

      views.setTextViewText(
        R.id.widgetDailyTitle,
        "🏠 일상"
      )

views.setOnClickPendingIntent(
  R.id.widgetStudyTitle,
  makeCategoryPendingIntent(context, "study")
)

views.setOnClickPendingIntent(
  R.id.widgetExerciseTitle,
  makeCategoryPendingIntent(context, "exercise")
)

views.setOnClickPendingIntent(
  R.id.widgetMentalTitle,
  makeCategoryPendingIntent(context, "mental")
)

views.setOnClickPendingIntent(
  R.id.widgetDailyTitle,
  makeCategoryPendingIntent(context, "daily")
)
views.setOnClickPendingIntent(
  R.id.widgetStudyBox,
  makeCategoryPendingIntent(context, "study")
)

views.setOnClickPendingIntent(
  R.id.widgetExerciseBox,
  makeCategoryPendingIntent(context, "exercise")
)

views.setOnClickPendingIntent(
  R.id.widgetMentalBox,
  makeCategoryPendingIntent(context, "mental")
)

views.setOnClickPendingIntent(
  R.id.widgetDailyBox,
  makeCategoryPendingIntent(context, "daily")
)

      bindFourGoals(
        context,
        views,
        data.optJSONArray("study"),
        isNewDay,
        R.id.widgetStudyGoal1,
        R.id.widgetStudyButton1,
        R.id.widgetStudyGoal2,
        R.id.widgetStudyButton2,
        R.id.widgetStudyGoal3,
        R.id.widgetStudyButton3,
        R.id.widgetStudyGoal4,
        R.id.widgetStudyButton4
      )

      bindFourGoals(
        context,
        views,
        data.optJSONArray("exercise"),
        isNewDay,
        R.id.widgetExerciseGoal1,
        R.id.widgetExerciseButton1,
        R.id.widgetExerciseGoal2,
        R.id.widgetExerciseButton2,
        R.id.widgetExerciseGoal3,
        R.id.widgetExerciseButton3,
        R.id.widgetExerciseGoal4,
        R.id.widgetExerciseButton4
      )

      bindFourGoals(
        context,
        views,
        data.optJSONArray("mental"),
        isNewDay,
        R.id.widgetMentalGoal1,
        R.id.widgetMentalButton1,
        R.id.widgetMentalGoal2,
        R.id.widgetMentalButton2,
        R.id.widgetMentalGoal3,
        R.id.widgetMentalButton3,
        R.id.widgetMentalGoal4,
        R.id.widgetMentalButton4
      )

      bindFourGoals(
        context,
        views,
        data.optJSONArray("daily"),
        isNewDay,
        R.id.widgetDailyGoal1,
        R.id.widgetDailyButton1,
        R.id.widgetDailyGoal2,
        R.id.widgetDailyButton2,
        R.id.widgetDailyGoal3,
        R.id.widgetDailyButton3,
        R.id.widgetDailyGoal4,
        R.id.widgetDailyButton4
      )

     bindTodos(
  context,
  views,
  if (isNewDay) {
    null
  } else {
    data.optJSONArray(
      "todos"
    )
  }
)

      val calorie = data.optJSONObject("calorie")

val storedIntake =
  calorie?.optInt(
    "intake",
    0
  ) ?: 0

val recommended =
  calorie?.optInt(
    "recommended",
    0
  ) ?: 0

val storedBurned =
  calorie?.optInt(
    "burned",
    0
  ) ?: 0

val storedRemain =
  calorie?.optInt(
    "remain",
    0
  ) ?: 0

val weight =
  calorie?.optString(
    "weight",
    ""
  ) ?: ""

val intake =
  if (isNewDay) {
    0
  } else {
    storedIntake
  }

val burned =
  if (isNewDay) {
    0
  } else {
    storedBurned
  }

val remain =
  if (isNewDay) {
    recommended
  } else {
    storedRemain
  }

views.setTextViewText(
  R.id.widgetCalorieTitle,
  if (weight.isNotBlank()) {
    "🔥 오늘 칼로리 · ${weight}kg"
  } else {
    "🔥 오늘 칼로리"
  }
)

views.setTextViewText(
  R.id.widgetCalorieText,
  "섭취 ${formatKcal(intake)} / 권장 ${formatKcal(recommended)} kcal\n소모 ${formatKcal(burned)} · 남음 ${formatKcal(remain)} kcal"
)

views.setOnClickPendingIntent(
  R.id.widgetMealBreakfast,
  makeMealPendingIntent(context, "breakfast")
)

views.setOnClickPendingIntent(
  R.id.widgetMealLunch,
  makeMealPendingIntent(context, "lunch")
)

views.setOnClickPendingIntent(
  R.id.widgetMealDinner,
  makeMealPendingIntent(context, "dinner")
)

views.setOnClickPendingIntent(
  R.id.widgetMealSnack,
  makeMealPendingIntent(context, "snack")
)

val ledgerObject = data.optJSONObject("ledger")

val ledgerExpenseText =
  if (isNewDay) {
    "0원"
  } else {
    data.optString(
      "ledgerExpenseText",
      ledgerObject?.optString(
        "expenseText",
        "0원"
      ) ?: "0원"
    ).ifBlank {
      "0원"
    }
  }

val ledgerIncomeText =
  if (isNewDay) {
    "0원"
  } else {
    data.optString(
      "ledgerIncomeText",
      ledgerObject?.optString(
        "incomeText",
        "0원"
      ) ?: "0원"
    ).ifBlank {
      "0원"
    }
  }

val ledgerRecentText =
  if (isNewDay) {
    "오늘 가계부 내역 없음"
  } else {
    data.optString(
      "ledgerRecentText",
      ledgerObject?.optString(
        "recentText",
        "오늘 가계부 내역 없음"
      ) ?: "오늘 가계부 내역 없음"
    ).ifBlank {
      "오늘 가계부 내역 없음"
    }
  }

views.setTextViewText(
  R.id.widget_ledger_title,
  "💰 오늘의 가계부"
)

views.setTextViewText(
  R.id.widget_ledger_summary,
  "지출 $ledgerExpenseText · 수입 $ledgerIncomeText"
)

views.setTextViewText(
  R.id.widget_ledger_recent,
  ledgerRecentText
)

/*
 * 오늘의 가계부 영역을 누르면
 * 하루 탭의 가계부 위치로 이동합니다.
 */
val openLedgerSectionPendingIntent =
  makeWidgetPendingIntent(
    context,
    "openLedgerSection",
    ""
  )

/*
 * + 가계부 버튼을 누르면
 * 가계부 입력창을 바로 엽니다.
 */
val openLedgerAddPendingIntent =
  makeWidgetPendingIntent(
    context,
    "openLedgerAdd",
    ""
  )

/*
 * 가계부 박스 전체
 */
views.setOnClickPendingIntent(
  R.id.widget_ledger_box,
  openLedgerSectionPendingIntent
)

/*
 * 가계부 제목
 */
views.setOnClickPendingIntent(
  R.id.widget_ledger_title,
  openLedgerSectionPendingIntent
)

/*
 * 지출·수입 합계
 */
views.setOnClickPendingIntent(
  R.id.widget_ledger_summary,
  openLedgerSectionPendingIntent
)

/*
 * 최근 가계부 내역
 */
views.setOnClickPendingIntent(
  R.id.widget_ledger_recent,
  openLedgerSectionPendingIntent
)

/*
 * + 가계부 버튼
 */
views.setOnClickPendingIntent(
  R.id.widget_ledger_add,
  openLedgerAddPendingIntent
)

      appWidgetManager.updateAppWidget(
        appWidgetId,
        views
      )
    }
  }

override fun onReceive(
  context: Context,
  intent: Intent
) {
  super.onReceive(
    context,
    intent
  )

  when (intent.action) {
    "ROOT_WIDGET_SLEEP_ACTION" -> {
      val sleepAction =
        intent.getStringExtra(
          "sleepAction"
        ) ?: return

      val prefs =
        context.getSharedPreferences(
          "root_widget_prefs",
          Context.MODE_PRIVATE
        )

      val now =
        System.currentTimeMillis()

      if (
        sleepAction ==
        "startSleep"
      ) {
        prefs.edit()
          .putString(
            "widget_sleep_start_at",
            now.toString()
          )
          .putString(
            "root_widget_data",
            updateSleepInWidgetJson(
              prefs.getString(
                "root_widget_data",
                null
              ),
              true,
              now.toString()
            )
          )
          .apply()

        showNativeSleepNotification(
          context
        )
      }

      if (
        sleepAction ==
        "finishSleep"
      ) {
        val startAtFromPrefs =
          prefs.getString(
            "widget_sleep_start_at",
            null
          )

        val startAtFromJson =
          getSleepStartedAtFromWidgetJson(
            prefs.getString(
              "root_widget_data",
              null
            )
          )

        val startAt =
          if (
            !startAtFromPrefs
              .isNullOrBlank()
          ) {
            startAtFromPrefs
          } else {
            startAtFromJson
          }

        val editor =
          prefs.edit()
            .remove(
              "widget_sleep_start_at"
            )
            .putString(
              "root_widget_data",
              updateSleepInWidgetJson(
                prefs.getString(
                  "root_widget_data",
                  null
                ),
                false,
                null
              )
            )

        if (
          !startAt.isNullOrBlank()
        ) {
          editor.putString(
            "pending_widget_sleep_record",
            JSONObject().apply {
              put(
                "startAt",
                startAt
              )

              put(
                "endAt",
                now.toString()
              )
            }.toString()
          )
        }

        editor.apply()

        cancelNativeSleepNotification(
          context
        )
      }
    }

    Intent.ACTION_DATE_CHANGED,
    Intent.ACTION_TIME_CHANGED,
    Intent.ACTION_TIMEZONE_CHANGED -> {
      /*
       * 날짜·시간·시간대 변경 시
       * 아래에서 위젯 전체를 다시 그립니다.
       */
    }

    else -> {
      return
    }
  }

  val appWidgetManager =
    AppWidgetManager.getInstance(
      context
    )

  val componentName =
    android.content.ComponentName(
      context,
      RootDayWidgetProvider::class.java
    )

  onUpdate(
    context,
    appWidgetManager,
    appWidgetManager
      .getAppWidgetIds(
        componentName
      )
  )
}

 private fun bindFourGoals(
  context: Context,
  views: RemoteViews,
  goals: JSONArray?,
  isNewDay: Boolean,
  goal1Id: Int,
  button1Id: Int,
  goal2Id: Int,
  button2Id: Int,
  goal3Id: Int,
  button3Id: Int,
  goal4Id: Int,
  button4Id: Int
) {
  bindGoalRow(
    context,
    views,
    goals?.optJSONObject(0),
    goal1Id,
    button1Id,
    isNewDay,
    true
  )

  bindGoalRow(
    context,
    views,
    goals?.optJSONObject(1),
    goal2Id,
    button2Id,
    isNewDay,
    false
  )

  bindGoalRow(
    context,
    views,
    goals?.optJSONObject(2),
    goal3Id,
    button3Id,
    isNewDay,
    false
  )

  bindGoalRow(
    context,
    views,
    goals?.optJSONObject(3),
    goal4Id,
    button4Id,
    isNewDay,
    false
  )
}

private fun bindGoalRow(
  context: Context,
  views: RemoteViews,
  goal: JSONObject?,
  goalTextId: Int,
  buttonId: Int,
  isNewDay: Boolean,
  showEmptyText: Boolean
) {
  if (goal == null) {
    views.setTextViewText(
      goalTextId,
      if (showEmptyText) {
        "아직없음"
      } else {
        ""
      }
    )

    views.setTextViewText(
      buttonId,
      ""
    )

    views.setViewVisibility(
      buttonId,
      View.GONE
    )

    return
  }

  val title =
    goal.optString(
      "title",
      "목표"
    )

  val type =
    goal.optString(
      "type",
      "check"
    )

  val goalId =
    goal.optString(
      "id",
      ""
    )

  val storedIsDone =
    goal.optBoolean(
      "isDone",
      false
    )

  val isRunning =
    goal.optBoolean(
      "isRunning",
      false
    )

  val storedButton =
    goal.optString(
      "button",
      if (type == "timer") {
        "시작"
      } else {
        "확인"
      }
    )

  /*
   * 날짜가 바뀌면 어제의 완료 상태는 사용하지 않습니다.
   */
  val isDone =
    if (isNewDay) {
      false
    } else {
      storedIsDone
    }

  /*
   * 새날 버튼 상태
   *
   * 실행 중인 타이머는 자정을 지나도 기록중 유지
   * 실행 중이 아닌 시간형은 시작
   * 확인형은 확인
   */
  val button =
    when {
      isNewDay &&
        type == "timer" &&
        isRunning -> {
        "기록중"
      }

      isNewDay &&
        type == "timer" -> {
        "시작"
      }

      isNewDay -> {
        "확인"
      }

      else -> {
        storedButton
      }
    }

  views.setTextViewText(
    goalTextId,
    title
  )

  views.setTextViewText(
    buttonId,
    button
  )

  views.setViewVisibility(
    buttonId,
    View.VISIBLE
  )

  /*
   * 시간 기록형 행동목표
   */
  if (type == "timer") {
    if (
      isDone ||
      button == "완료"
    ) {
      views.setInt(
        buttonId,
        "setBackgroundResource",
        R.drawable.root_widget_check_button
      )

      views.setTextColor(
        buttonId,
        Color.parseColor("#4D7A35")
      )

      views.setTextViewText(
        buttonId,
        "완료"
      )

      views.setOnClickPendingIntent(
        buttonId,
        makeOpenAppPendingIntent(
          context
        )
      )

      return
    }

    views.setInt(
      buttonId,
      "setBackgroundResource",
      R.drawable.root_widget_start_button
    )

    views.setTextColor(
      buttonId,
      Color.parseColor("#A65322")
    )

    if (button == "기록중") {
      views.setOnClickPendingIntent(
        buttonId,
        makeOpenAppPendingIntent(
          context
        )
      )
    } else {
      views.setOnClickPendingIntent(
        buttonId,
        makeWidgetPendingIntent(
          context,
          "startTimer",
          goalId
        )
      )
    }

    return
  }

  /*
   * 확인형 행동목표
   */
  views.setInt(
    buttonId,
    "setBackgroundResource",
    R.drawable.root_widget_check_button
  )

  views.setTextColor(
    buttonId,
    Color.parseColor("#4D7A35")
  )

  if (
    isDone ||
    button == "완료"
  ) {
    views.setTextViewText(
      buttonId,
      "완료"
    )

    views.setOnClickPendingIntent(
      buttonId,
      makeOpenAppPendingIntent(
        context
      )
    )
  } else {
    views.setTextViewText(
      buttonId,
      "확인"
    )

    views.setOnClickPendingIntent(
      buttonId,
      makeWidgetPendingIntent(
        context,
        "completeGoal",
        goalId
      )
    )
  }
}


private fun bindTodos(
  context: Context,
  views: RemoteViews,
  todos: JSONArray?
) {
  views.setTextViewText(
    R.id.widgetTodoTitle,
    "📋 오늘의 할일"
  )

  val first = todos?.optJSONObject(0)
  val second = todos?.optJSONObject(1)
  val third = todos?.optJSONObject(2)
  val fourth = todos?.optJSONObject(3)

  views.setTextViewText(
    R.id.widgetTodo1,
    formatTodo(first)
  )

  views.setTextViewText(
    R.id.widgetTodo2,
    formatTodo(second)
  )

  views.setTextViewText(
    R.id.widgetTodo3,
    formatTodo(third)
  )

  views.setTextViewText(
    R.id.widgetTodo4,
    formatTodo(fourth)
  )

  views.setTextViewText(
    R.id.widgetTodoAdd,
    "+ 추가하기"
  )

  val openDayPendingIntent =
    makeWidgetPendingIntent(
      context,
      "openDay",
      ""
    )

  val openTodoAddPendingIntent =
    makeWidgetPendingIntent(
      context,
      "openTodoAdd",
      ""
    )

  views.setOnClickPendingIntent(
    R.id.widgetTodoTitle,
    openDayPendingIntent
  )

  views.setOnClickPendingIntent(
    R.id.widgetTodo1,
    openDayPendingIntent
  )

  views.setOnClickPendingIntent(
    R.id.widgetTodo2,
    openDayPendingIntent
  )

  views.setOnClickPendingIntent(
    R.id.widgetTodo3,
    openDayPendingIntent
  )

  views.setOnClickPendingIntent(
    R.id.widgetTodo4,
    openDayPendingIntent
  )

  views.setOnClickPendingIntent(
    R.id.widgetTodoAdd,
    openTodoAddPendingIntent
  )
}

  private fun formatTodo(
    todo: JSONObject?
  ): String {
    if (todo == null) {
      return "□ -------------------"
    }

    val text = todo.optString(
      "text",
      ""
    )

    val completed = todo.optBoolean(
      "completed",
      false
    )

    if (text.isBlank()) {
      return "□ -------------------"
    }

    return if (completed) {
      "☑ $text"
    } else {
      "□ $text"
    }
  }

  private fun makeWidgetPendingIntent(
  context: Context,
  action: String,
  goalId: String
): PendingIntent {
  val uri = Uri.parse(
  "rootappnew://widget?action=$action&goalId=$goalId&widgetTs=${System.currentTimeMillis()}"
)

  val intent = Intent(
    Intent.ACTION_VIEW,
    uri,
    context,
    MainActivity::class.java
  ).apply {
    flags =
      Intent.FLAG_ACTIVITY_NEW_TASK or
      Intent.FLAG_ACTIVITY_CLEAR_TOP
  }

  return PendingIntent.getActivity(
    context,
    uri.toString().hashCode(),
    intent,
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
  )
}

private fun makeSleepBroadcastPendingIntent(
  context: Context,
  action: String
): PendingIntent {
  val intent = Intent(
    context,
    RootDayWidgetProvider::class.java
  ).apply {
    this.action = "ROOT_WIDGET_SLEEP_ACTION"
    putExtra("sleepAction", action)
  }

  return PendingIntent.getBroadcast(
    context,
    "sleep_$action".hashCode(),
    intent,
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
  )
}

private fun updateSleepInWidgetJson(
  rawJson: String?,
  isSleeping: Boolean,
  startedAt: String?
): String {
  val data = try {
    if (rawJson.isNullOrBlank()) {
      JSONObject()
    } else {
      JSONObject(rawJson)
    }
  } catch (e: Exception) {
    JSONObject()
  }

  val sleep = JSONObject().apply {
    put("isSleeping", isSleeping)

    if (startedAt.isNullOrBlank()) {
      put("startedAt", JSONObject.NULL)
    } else {
      put("startedAt", startedAt)
    }
  }

  data.put("sleep", sleep)
  data.put("updatedAt", System.currentTimeMillis())

  return data.toString()
}

private fun getSleepStartedAtFromWidgetJson(
  rawJson: String?
): String? {
  return try {
    if (rawJson.isNullOrBlank()) {
      null
    } else {
      val data = JSONObject(rawJson)
      val sleep = data.optJSONObject("sleep")
      val startedAt = sleep?.optString("startedAt", "") ?: ""

      if (
        startedAt.isBlank() ||
        startedAt == "null"
      ) {
        null
      } else {
        startedAt
      }
    }
  } catch (e: Exception) {
    null
  }
}

private fun showNativeSleepNotification(
  context: Context
) {
  if (
    Build.VERSION.SDK_INT >= 33 &&
    ContextCompat.checkSelfPermission(
      context,
      Manifest.permission.POST_NOTIFICATIONS
    ) != PackageManager.PERMISSION_GRANTED
  ) {
    return
  }

  val manager =
    context.getSystemService(Context.NOTIFICATION_SERVICE)
      as NotificationManager

  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
    val channel = NotificationChannel(
      SLEEP_CHANNEL_ID,
      "루트 수면 기록",
      NotificationManager.IMPORTANCE_HIGH
    )

    manager.createNotificationChannel(channel)
  }

  val notification =
    NotificationCompat.Builder(context, SLEEP_CHANNEL_ID)
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle("🌙 루트 수면 기록 중")
      .setContentText("수면이 기록되고 있어요.")
      .setOngoing(true)
      .setAutoCancel(false)
      .setContentIntent(makeOpenAppPendingIntent(context))
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .build()

  manager.notify(
    SLEEP_NOTIFICATION_ID,
    notification
  )
}

private fun cancelNativeSleepNotification(
  context: Context
) {
  val manager =
    context.getSystemService(Context.NOTIFICATION_SERVICE)
      as NotificationManager

  manager.cancel(SLEEP_NOTIFICATION_ID)
}

private fun makeOpenAppPendingIntent(
  context: Context
): PendingIntent {
  val intent = Intent(
    context,
    MainActivity::class.java
  ).apply {
    flags =
      Intent.FLAG_ACTIVITY_NEW_TASK or
      Intent.FLAG_ACTIVITY_CLEAR_TOP
  }

  return PendingIntent.getActivity(
    context,
    "open_root_app".hashCode(),
    intent,
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
  )
}


private fun makeCategoryPendingIntent(
  context: Context,
  category: String
): PendingIntent {
  val uri = Uri.parse(
  "rootappnew://widget?action=openCategory&category=$category&widgetTs=${System.currentTimeMillis()}"
)

  val intent = Intent(
    Intent.ACTION_VIEW,
    uri,
    context,
    MainActivity::class.java
  ).apply {
    flags =
      Intent.FLAG_ACTIVITY_NEW_TASK or
      Intent.FLAG_ACTIVITY_CLEAR_TOP
  }

  return PendingIntent.getActivity(
    context,
    uri.toString().hashCode(),
    intent,
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
  )
 
}

private fun makeMealPendingIntent(
  context: Context,
  mealType: String
): PendingIntent {
  val uri = Uri.parse(
  "rootappnew://widget?action=openMealAdd&mealType=$mealType&widgetTs=${System.currentTimeMillis()}"
)

  val intent = Intent(
    Intent.ACTION_VIEW,
    uri,
    context,
    MainActivity::class.java
  ).apply {
    flags =
      Intent.FLAG_ACTIVITY_NEW_TASK or
      Intent.FLAG_ACTIVITY_CLEAR_TOP
  }

  return PendingIntent.getActivity(
    context,
    uri.toString().hashCode(),
    intent,
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
  )
}

private fun formatKcal(value: Int): String {
  if (value <= 0) return "-"
  return "%,d".format(value)
}


}