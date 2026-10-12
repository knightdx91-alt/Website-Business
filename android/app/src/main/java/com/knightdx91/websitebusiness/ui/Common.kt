package com.knightdx91.websitebusiness.ui

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Row
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material3.Icon
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.knightdx91.websitebusiness.net.Api
import com.knightdx91.websitebusiness.net.Lead
import com.knightdx91.websitebusiness.net.Step
import com.knightdx91.websitebusiness.net.report
import com.knightdx91.websitebusiness.net.setAlertMode
import com.knightdx91.websitebusiness.net.AlertPrefs
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.TextButton
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.launch

/** A card with a bold title, the way every screen lays out its sections. */
@Composable
fun SectionCard(title: String, modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Card(modifier.fillMaxWidth()) {
        Column(Modifier.padding(14.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            content()
        }
    }
}

/**
 * A section that opens when its header is tapped and closes the same way (Settings: most sections are rarely edited, so
 * they start closed and the page stays short). Open/closed is remembered per title while the screen lives. Form state
 * must be hoisted outside the card, as Settings does, so closing a section never loses typed values.
 */
@Composable
fun CollapsibleCard(title: String, modifier: Modifier = Modifier, defaultOpen: Boolean = false, summary: String? = null, content: @Composable () -> Unit) {
    var open by rememberSaveable(title) { mutableStateOf(defaultOpen) }
    Card(modifier.fillMaxWidth()) {
        Column(Modifier.padding(14.dp)) {
            Row(Modifier.fillMaxWidth().clickable { open = !open }, verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    if (!open && !summary.isNullOrBlank()) Text(summary, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Icon(if (open) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown, if (open) "Collapse" else "Expand", tint = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            if (open) content()
        }
    }
}

/** An image behind the login (preview photos, gallery thumbnails): fetched with the session token, decoded small. */
@Composable
fun AuthImage(api: Api, path: String, modifier: Modifier = Modifier, maxPx: Int = 600, contentScale: ContentScale = ContentScale.Crop) {
    var bmp by remember(path) { mutableStateOf<Bitmap?>(null) }
    LaunchedEffect(path) {
        bmp = runCatching {
            val bytes = api.bytes(path)
            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
            var sample = 1
            while (bounds.outWidth / sample > maxPx * 2 || bounds.outHeight / sample > maxPx * 2) sample *= 2
            BitmapFactory.decodeByteArray(bytes, 0, bytes.size, BitmapFactory.Options().apply { inSampleSize = sample })
        }.getOrNull()
    }
    val b = bmp
    if (b != null) Image(b.asImageBitmap(), contentDescription = null, modifier = modifier, contentScale = contentScale)
    else Box(modifier)
}

/* ---------- the one next step (Oct 2026; words from the server, see src/worker/queue.ts) ---------- */

val STEP_ICON = mapOf("take_payment" to "💳", "callback" to "📅", "opened" to "👀", "follow_up" to "🔁", "publish" to "🚀", "call" to "📞", "building" to "⏳", "failed" to "⚠️", "live" to "🌐", "closed" to "✋", "cadence_done" to "🏁")

/** The lead page's top card: what to do next and the one button that does it. */
@Composable
fun NextStepCard(step: Step, actions: @Composable () -> Unit) {
    val tint = when (step.key) { "take_payment", "callback" -> Warn; "publish", "opened" -> Good; "failed" -> MaterialTheme.colorScheme.error; else -> MaterialTheme.colorScheme.primary }
    Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
        Row {
            Box(Modifier.width(6.dp).fillMaxHeight().background(tint))
            Column(Modifier.padding(14.dp).weight(1f)) {
                Text("NEXT STEP", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold)
                Text("${STEP_ICON[step.key] ?: "👉"} ${step.title}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                if (step.detail.isNotBlank()) Text(step.detail, style = MaterialTheme.typography.bodyMedium)
                Spacer(Modifier.height(8.dp))
                actions()
            }
        }
    }
}

/* ---------- Report a problem ---------- */

/**
 * "Report this": one question (what were you doing?), then the screen, the last failed request and the phone go to
 * POST /api/report. The owner reads them in Settings → Problems reported and gets a 🐞 alert.
 */
@Composable
fun ReportProblemDialog(api: Api, screen: String, leadId: String? = null, message: String? = null, onClose: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var step by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    val last = api.lastError?.takeIf { System.currentTimeMillis() - it.at < 2 * 60_000L }
    AlertDialog(
        onDismissRequest = { if (!busy) onClose() },
        title = { Text("🐞 Report a problem") },
        text = {
            Column {
                Text("What were you trying to do? One line is plenty. The screen, the last error and the phone go along by themselves.", style = MaterialTheme.typography.bodyMedium)
                OutlinedTextField(step, { step = it.take(120) }, label = { Text("What you were doing") }, placeholder = { Text("e.g. Tapping Take payment on Reyes Pizza") }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp))
                if (last != null) Text("Last error: ${last.message}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 6.dp))
            }
        },
        confirmButton = {
            Button(onClick = {
                busy = true
                scope.launch {
                    try { api.report(screen, step, message, leadId); context.toast("Thanks, it's reported. The owner sees it under Settings → Problems reported."); onClose() }
                    catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { context.toast("Couldn't send the report: ${e.message}"); busy = false }
                }
            }, enabled = !busy) { Text(if (busy) "Sending…" else "Send") }
        },
        dismissButton = { TextButton(onClick = onClose, enabled = !busy) { Text("Cancel") } },
    )
}

/** A small button that opens the report dialog; screens drop it where help belongs. */
@Composable
fun ReportProblemButton(api: Api, screen: String, leadId: String? = null) {
    var open by remember { mutableStateOf(false) }
    OutlinedButton(onClick = { open = true }) { Text("🐞 Report a problem") }
    if (open) ReportProblemDialog(api, screen, leadId) { open = false }
}

/* ---------- alert preferences ---------- */

/** Everything / My leads / Important only, saved per person on the server (applies to the list, the badge and pushes). */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AlertModeCard(api: Api, prefs: AlertPrefs?, onChanged: (AlertPrefs) -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    if (prefs == null) return
    SectionCard("What you get alerted about") {
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 6.dp)) {
            prefs.modes.forEach { m ->
                FilterChip(selected = prefs.mode == m.id, onClick = {
                    scope.launch {
                        try { onChanged(api.setAlertMode(m.id)); context.toast("Saved") } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { context.toast(e.message ?: "Couldn't save") }
                    }
                }, label = { Text(m.label) })
            }
        }
        prefs.modes.firstOrNull { it.id == prefs.mode }?.let { Text(it.about, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 6.dp)) }
        Text("Applies to this list, the badge and phone alerts, in the app and on the web.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp))
    }
}
