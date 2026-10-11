package com.knightdx91.websitebusiness.alerts

import android.Manifest
import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.drawable.Icon
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
        return try {
            Alerts.deliver(applicationContext, api)
            // A newer build on the server gets its own notification, once per version (instant via Firebase when set up;
            // this is the fallback).
            com.knightdx91.websitebusiness.update.Updater.notifyIfNewer(applicationContext, api)
            Result.success()
        } catch (e: Api.Unauthorized) {
            Result.success()
        } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) {
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

/** Fetches the team events this person hasn't been shown and posts them (used by the 15-minute worker and by a push). */
object Alerts {
    suspend fun deliver(context: Context, api: Api) {
        if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
        val n = api.notifications()
        val since = api.prefs.lastAlertAt
        val fresh = n.items.filter { it.unread && it.at > since }.sortedBy { it.at }
        val nm = context.getSystemService(NotificationManager::class.java)
        fresh.takeLast(5).forEach { e ->
            val open = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                e.leadId?.let { putExtra("lead", it) }
            }
            val pi = PendingIntent.getActivity(context, e.id.hashCode(), open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            val notification = Notification.Builder(context, AlertWorker.CHANNEL)
                .setSmallIcon(R.drawable.ic_notification)
                .setLargeIcon(Icon.createWithResource(context, R.mipmap.ic_launcher))
                .setColor(0xFFFCA311.toInt())
                .setContentTitle(e.leadName ?: context.getString(R.string.appName))
                .setContentText(e.text)
                .setStyle(Notification.BigTextStyle().bigText(e.text))
                .setContentIntent(pi)
                .setAutoCancel(true)
                .build()
            nm.notify(e.id.hashCode(), notification)
        }
        if (fresh.isNotEmpty()) api.prefs.lastAlertAt = fresh.last().at
    }
}
