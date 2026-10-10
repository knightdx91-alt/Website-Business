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
 * written by android/build.sh). The app checks once a day, downloads the APK into its cache and hands it to Android's package
 * installer, which asks the owner to confirm. (A Google Play listing would make this silent; see CLAUDE.md.)
 */
object Updater {
    data class Check(val versionCode: Int, val versionName: String, val url: String)

    suspend fun check(api: Api): Check {
        val j = api.androidVersion()
        return Check(j.optInt("versionCode", 0), j.optString("versionName", "?"), j.optString("url", api.origin + "/api/android.apk"))
    }

    /** Once a day: remember a newer build so Settings can show it (no download without a tap). */
    suspend fun checkDaily(context: Context, api: Api) {
        val prefs = api.prefs
        if (System.currentTimeMillis() - prefs.lastUpdateCheck < 24 * 3600_000L) return
        prefs.lastUpdateCheck = System.currentTimeMillis()
        runCatching { check(api) }
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
