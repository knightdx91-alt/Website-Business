package com.knightdx91.websitebusiness.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.knightdx91.websitebusiness.net.AiKeyStatus
import com.knightdx91.websitebusiness.net.Api
import com.knightdx91.websitebusiness.net.aiKey
import com.knightdx91.websitebusiness.net.clearAiKey
import com.knightdx91.websitebusiness.net.setAiKey
import kotlinx.coroutines.launch
import java.text.DateFormat
import java.util.Date

/** Settings → 🤖 Claude API key (owner): swap in another Anthropic account's key; the server checks it before saving. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AiKeyCard(api: Api) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var status by remember { mutableStateOf<AiKeyStatus?>(null) }
    var loadError by remember { mutableStateOf("") }
    var key by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var confirmClear by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        try { status = api.aiKey() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { loadError = e.message ?: "Couldn't check" }
    }
    CollapsibleCard("🤖 Claude API key") {
        Text(
            "The key the app uses to write websites, call guides and designs. Out of credit? Paste a key from another Anthropic account (console.anthropic.com → API keys). It's checked before it's saved.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        val st = status
        val line = when {
            st == null -> loadError.ifBlank { "Checking…" }
            st.unreadable -> "⚠️ A saved key can't be read any more (the app's secret changed). Paste it again." + if (st.workerKey) " Until then the original key is used." else ""
            st.using == "app" -> "✅ Using the key you saved here, ending …${st.last4 ?: ""}" +
                (st.savedBy?.let { ", saved by $it" } ?: "") +
                (st.savedAt?.let { " on ${DateFormat.getDateInstance(DateFormat.MEDIUM).format(Date(it))}" } ?: "") + "."
            st.using == "worker" -> "Using the original key (set on the server)."
            else -> "⚠️ No key is set: AI writing is off until you add one."
        }
        Text(line, color = if (st?.using == "app" && !st.unreadable) Good else MaterialTheme.colorScheme.onSurface, modifier = Modifier.padding(top = 8.dp))
        OutlinedTextField(
            value = key,
            onValueChange = { key = it; error = "" },
            label = { Text("New key") },
            placeholder = { Text("sk-ant-…") },
            singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, autoCorrectEnabled = false),
            modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
        )
        if (error.isNotBlank()) Text("⚠️ $error", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 8.dp)) {
            Button(
                onClick = {
                    busy = true
                    error = ""
                    scope.launch {
                        try {
                            status = api.setAiKey(key.trim())
                            key = ""
                            context.toast("New Claude key saved. The app uses it from now on.")
                        } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) {
                            error = e.message ?: "Couldn't save the key"
                        } finally { busy = false }
                    }
                },
                enabled = !busy && key.isNotBlank(),
            ) { Text(if (busy) "Checking the key…" else "Check and use this key") }
            if (st != null && (st.using == "app" || st.unreadable) && st.workerKey)
                OutlinedButton(onClick = { confirmClear = true }, enabled = !busy) { Text("Go back to the original key") }
        }
    }
    if (confirmClear) AlertDialog(
        onDismissRequest = { confirmClear = false },
        title = { Text("Go back to the original key?") },
        text = { Text("The app stops using the key saved here and uses the one set on the server again.") },
        confirmButton = {
            TextButton(onClick = {
                confirmClear = false
                scope.launch {
                    try { status = api.clearAiKey(); context.toast("Back on the original key.") } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { context.toast(e.message ?: "Couldn't change it") }
                }
            }) { Text("Go back") }
        },
        dismissButton = { TextButton(onClick = { confirmClear = false }) { Text("Cancel") } },
    )
}
