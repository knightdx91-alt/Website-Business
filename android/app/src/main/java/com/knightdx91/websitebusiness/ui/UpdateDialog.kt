package com.knightdx91.websitebusiness.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.knightdx91.websitebusiness.BuildConfig
import com.knightdx91.websitebusiness.net.Api
import com.knightdx91.websitebusiness.update.Updater
import kotlinx.coroutines.launch

/**
 * "Update available" pop-up shown right after launch when the Worker has a newer build. Download and install fetches the APK
 * and opens Android's installer; Later hides this version for a day (Settings → Android app still offers it any time).
 */
@Composable
fun UpdateDialog(api: Api, update: Updater.Check, onDone: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var progress by remember { mutableStateOf<Float?>(null) }
    var message by remember { mutableStateOf("") }
    val busy = progress != null

    fun install() {
        scope.launch {
            try {
                progress = 0f
                message = "Downloading ${update.versionName}…"
                Updater.downloadAndInstall(context, api, update) { p -> progress = p }
                message = "Android will ask you to install it."
                onDone()
            } catch (e: Exception) {
                message = e.message ?: "Update failed"
            } finally {
                progress = null
            }
        }
    }

    AlertDialog(
        onDismissRequest = { if (!busy) { Updater.snooze(api, update); onDone() } },
        title = { Text("Update available") },
        text = {
            Column {
                Text("Version ${update.versionName} is ready. You have ${BuildConfig.VERSION_NAME}.")
                Text("Download takes about a minute, then Android asks you to install it. The app reopens where you left off.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 6.dp))
                progress?.let { p -> LinearProgressIndicator(progress = { p }, modifier = Modifier.fillMaxWidth().padding(top = 12.dp)) }
                if (message.isNotBlank()) Text(message, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 8.dp))
            }
        },
        confirmButton = { Button(onClick = { install() }, enabled = !busy) { Text("Download and install") } },
        dismissButton = { TextButton(onClick = { Updater.snooze(api, update); onDone() }, enabled = !busy) { Text("Later") } },
    )
}
