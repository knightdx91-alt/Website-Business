package com.knightdx91.websitebusiness.alerts

import android.Manifest
import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.knightdx91.websitebusiness.MainActivity
import com.knightdx91.websitebusiness.R
import com.knightdx91.websitebusiness.net.Api
import java.util.concurrent.TimeUnit

/**
 * Team alerts without Web Push: every 15 minutes (Android's minimum for background work) the app asks the Worker for new
 * events and shows the ones it hasn't shown yet. Opening the Alerts screen marks everything as seen.
 */
class AlertWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val api = Api(applicationContext)
        if (!api.prefs.loggedIn) return Result.success()
        if (Build.VERSION.SDK_INT >= 33 && applicationContext.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return Result.success()
        return try {
            val n = api.notifications()
            val since = api.prefs.lastAlertAt
            val fresh = n.items.filter { it.unread && it.at > since }.sortedBy { it.at }
            val nm = applicationContext.getSystemService(NotificationManager::class.java)
            fresh.takeLast(5).forEach { e ->
                val open = Intent(applicationContext, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                    e.leadId?.let { putExtra("lead", it) }
                }
                val pi = PendingIntent.getActivity(applicationContext, e.id.hashCode(), open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
                val notification = Notification.Builder(applicationContext, CHANNEL)
                    .setSmallIcon(R.drawable.ic_notification)
                    .setContentTitle(e.leadName ?: applicationContext.getString(R.string.appName))
                    .setContentText(e.text)
                    .setStyle(Notification.BigTextStyle().bigText(e.text))
                    .setContentIntent(pi)
                    .setAutoCancel(true)
                    .build()
                nm.notify(e.id.hashCode(), notification)
            }
            if (fresh.isNotEmpty()) api.prefs.lastAlertAt = fresh.last().at
            Result.success()
        } catch (e: Api.Unauthorized) {
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }

    companion object {
        const val CHANNEL = "team"

        fun schedule(context: Context) {
            val req = PeriodicWorkRequestBuilder<AlertWorker>(15, TimeUnit.MINUTES).build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork("alerts", ExistingPeriodicWorkPolicy.KEEP, req)
        }
    }
}
