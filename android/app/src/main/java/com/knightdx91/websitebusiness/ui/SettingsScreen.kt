package com.knightdx91.websitebusiness.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.knightdx91.websitebusiness.AppState
import com.knightdx91.websitebusiness.BuildConfig
import com.knightdx91.websitebusiness.net.TapStatus
import com.knightdx91.websitebusiness.update.Updater
import com.knightdx91.websitebusiness.webRoute
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun SettingsScreen(state: AppState, nav: NavHostController) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val meta = state.meta
    val prefs = state.api.prefs
    var tap by remember { mutableStateOf<TapStatus?>(null) }
    var update by remember { mutableStateOf<Updater.Check?>(null) }
    var updateMsg by remember { mutableStateOf("") }
    var progress by remember { mutableStateOf<Float?>(null) }

    LaunchedEffect(Unit) {
        state.refreshMeta()
        if (state.meta?.isOwner == true) runCatching { tap = state.api.tapStatus() }
        update = runCatching { Updater.check(state.api) }.getOrNull()
    }

    fun install() {
        val u = update ?: return
        scope.launch {
            try {
                progress = 0f
                updateMsg = "Downloading ${u.versionName}…"
                Updater.downloadAndInstall(context, state.api, u) { p -> progress = p }
                updateMsg = "Android will ask you to install it."
            } catch (e: Exception) { updateMsg = e.message ?: "Update failed" } finally { progress = null }
        }
    }

    Scaffold(topBar = { TopAppBar(title = { Text("Settings") }) }) { pad ->
        LazyColumn(Modifier.fillMaxSize().padding(pad), contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        Text("Signed in", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text("${meta?.meName ?: prefs.name}${if (meta?.isOwner == true) " · full access" else " · caller"}${if (prefs.email.isNotBlank()) "\n${prefs.email}" else ""}")
                        OutlinedButton(onClick = { scope.launch { state.api.logout(); state.signOut() } }, modifier = Modifier.padding(top = 8.dp)) { Text("Sign out") }
                    }
                }
            }
            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        Text("App version ${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        val u = update
                        when {
                            u == null -> Text("Checking for updates…", color = MaterialTheme.colorScheme.onSurfaceVariant)
                            u.versionCode > BuildConfig.VERSION_CODE -> {
                                Text("Update available: ${u.versionName} (${u.versionCode}).", color = Good)
                                Button(onClick = { install() }, enabled = progress == null, modifier = Modifier.padding(top = 6.dp)) { Text("Download and install") }
                            }
                            else -> Text("You're on the newest build. The app checks once a day and tells you when there's a new one.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        progress?.let { LinearProgressIndicator(progress = { it }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) }
                        if (updateMsg.isNotBlank()) Text(updateMsg, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp))
                    }
                }
            }
            if (meta?.isOwner == true) item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        Text("💳 Tap to Pay", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        val t = tap
                        when {
                            t == null -> Text("Checking…", color = MaterialTheme.colorScheme.onSurfaceVariant)
                            t.ready -> Text("Ready · ${t.address ?: ""}", color = Good)
                            else -> {
                                Text("Not ready: ${t.why ?: ""}")
                                if (meta.checkoutOnline) Button(onClick = { scope.launch { try { state.api.tapSetup(); tap = state.api.tapStatus(); state.refreshMeta(); context.toast("Tap to Pay is set up") } catch (e: Exception) { context.toast(e.message ?: "Couldn't set up") } } }, modifier = Modifier.padding(top = 6.dp)) { Text("Set up Tap to Pay") }
                            }
                        }
                        Text("Needs NFC and Location on, Developer options off, Android 13+. Fees 2.7% + 5¢ + 10¢ per tap; renewals on the saved card are online charges.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 6.dp))
                    }
                }
            }
            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        Text("More", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            OutlinedButton(onClick = { nav.navigate(webRoute("/#/playbook")) }) { Text("💬 Plans & answers") }
                            OutlinedButton(onClick = { nav.navigate(webRoute("/#/plans")) }) { Text("📋 Show plans") }
                            OutlinedButton(onClick = { nav.navigate(webRoute("/#/walkin")) }) { Text("🚶 In-person guide") }
                            if (meta?.isOwner == true) {
                                OutlinedButton(onClick = { nav.navigate(webRoute("/#/inbox")) }) { Text("📥 Inbox") }
                                OutlinedButton(onClick = { nav.navigate(webRoute("/#/sales")) }) { Text("📈 Sales") }
                                OutlinedButton(onClick = { nav.navigate(webRoute("/#/settings")) }) { Text("⚙️ All settings") }
                            }
                        }
                    }
                }
            }
        }
    }
}
