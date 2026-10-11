package com.knightdx91.websitebusiness.update

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.core.content.FileProvider
import com.knightdx91.websitebusiness.BuildConfig
import com.knightdx91.websitebusiness.net.Api
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/**
 * In-app updates for a sideloaded build: the Worker publishes the newest version next to the APK (`GET /api/android/version`,
 * written by android/build.sh). The app checks on every launch and pops up "Update available" (ui/UpdateDialog.kt); Download
 * fetches the APK into the app's cache and hands it to Android's package installer, which asks the owner to confirm. (A Google Play listing would make this silent; see CLAUDE.md.)
 */
object Updater {
    data class Check(val versionCode: Int, val versionName: String, val url: String)

    suspend fun check(api: Api): Check {
        val j = api.androidVersion()
        return Check(j.optInt("versionCode", 0), j.optString("versionName", "?"), j.optString("url", api.origin + "/api/android.apk"))
    }

    /** True when the published build is newer than this one. */
    fun isNewer(c: Check): Boolean = c.versionCode > BuildConfig.VERSION_CODE

    /**
     * On every launch (after sign-in): the newer build to offer, or null. Quiet when offline. The owner can put a version off
     * with "Later", which hides that one version until the next day so the pop-up doesn't nag on every open.
     */
    suspend fun newerBuild(api: Api, ignoreSnooze: Boolean = false): Check? {
        val prefs = api.prefs
        prefs.lastUpdateCheck = System.currentTimeMillis()
        val c = runCatching { check(api) }.getOrNull() ?: return null
        if (!isNewer(c)) return null
        if (!ignoreSnooze && prefs.updateSnoozedCode == c.versionCode && System.currentTimeMillis() - prefs.updateSnoozedAt < 24 * 3600_000L) return null
        return c
    }

    /** How often the open app re-checks on its own (resume + timer); the background worker covers the rest. */
    const val IN_APP_CHECK_MS = 15 * 60_000L
    const val UPDATE_NOTIFICATION_ID = 7_001

    /**
     * Background: the alert worker calls this every 15 minutes. One notification per new build ("Update available: 2.14");
     * tapping it opens the app straight into the update pop-up (MainActivity extra "update").
     */
    suspend fun notifyIfNewer(context: Context, api: Api) {
        val c = runCatching { check(api) }.getOrNull() ?: return
        if (!isNewer(c)) return
        if (api.prefs.updateNotifiedCode == c.versionCode) return
        val open = Intent(context, com.knightdx91.websitebusiness.MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("update", true)
        }
        val pi = android.app.PendingIntent.getActivity(context, UPDATE_NOTIFICATION_ID, open, android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE)
        val n = android.app.Notification.Builder(context, com.knightdx91.websitebusiness.alerts.AlertWorker.CHANNEL)
            .setSmallIcon(com.knightdx91.websitebusiness.R.drawable.ic_notification)
            .setLargeIcon(android.graphics.drawable.Icon.createWithResource(context, com.knightdx91.websitebusiness.R.mipmap.ic_launcher))
            .setColor(0xFFFCA311.toInt())
            .setContentTitle("Update available: ${c.versionName}")
            .setContentText("Tap to download and install. You have ${BuildConfig.VERSION_NAME}.")
            .setContentIntent(pi)
            .setAutoCancel(true)
            .build()
        context.getSystemService(android.app.NotificationManager::class.java).notify(UPDATE_NOTIFICATION_ID, n)
        api.prefs.updateNotifiedCode = c.versionCode
    }

    /** After an install, the old "Update available" notification is stale. */
    fun clearNotification(context: Context) {
        runCatching { context.getSystemService(android.app.NotificationManager::class.java).cancel(UPDATE_NOTIFICATION_ID) }
    }

    fun snooze(api: Api, c: Check) {
        api.prefs.updateSnoozedCode = c.versionCode
        api.prefs.updateSnoozedAt = System.currentTimeMillis()
    }

    suspend fun downloadAndInstall(context: Context, api: Api, c: Check, onProgress: (Float) -> Unit) {
        if (!context.packageManager.canRequestPackageInstalls()) {
            context.startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${context.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            throw IllegalStateException("Allow this app to install updates (the Settings page just opened), then tap Download again.")
        }
        val dir = File(context.cacheDir, "updates").apply { mkdirs() }
        val file = File(dir, "website-business-${c.versionCode}.apk")
        withContext(Dispatchers.IO) {
            val conn = URL(c.url).openConnection() as HttpURLConnection
            try {
                api.prefs.token?.let { conn.setRequestProperty("Authorization", "Bearer $it") }
                conn.connectTimeout = 15_000
                conn.readTimeout = 120_000
                if (conn.responseCode >= 400) throw IllegalStateException("Download failed (${conn.responseCode})")
                val total = conn.contentLengthLong
                var read = 0L
                conn.inputStream.use { input ->
                    file.outputStream().use { out ->
                        val buf = ByteArray(64 * 1024)
                        while (true) {
                            val n = input.read(buf)
                            if (n < 0) break
                            out.write(buf, 0, n)
                            read += n
                            if (total > 0) onProgress(read.toFloat() / total)
                        }
                    }
                }
            } finally {
                conn.disconnect()
            }
        }
        val uri = FileProvider.getUriForFile(context, "${BuildConfig.APPLICATION_ID}.files", file)
        context.startActivity(
            Intent(Intent.ACTION_VIEW)
                .setDataAndType(uri, "application/vnd.android.package-archive")
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION),
        )
    }
}
