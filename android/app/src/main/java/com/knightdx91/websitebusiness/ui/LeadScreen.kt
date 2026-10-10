package com.knightdx91.websitebusiness.ui

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.navigation.NavHostController
import com.knightdx91.websitebusiness.AppState
import com.knightdx91.websitebusiness.net.LeadDetail
import com.knightdx91.websitebusiness.tap.TapToPayActivity
import com.knightdx91.websitebusiness.webRoute
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun LeadScreen(state: AppState, nav: NavHostController, id: String) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var d by remember { mutableStateOf<LeadDetail?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var outcome by remember { mutableStateOf<String?>(null) }
    var note by remember { mutableStateOf("") }
    var callback by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val meta = state.meta
    val isOwner = meta?.isOwner == true

    suspend fun load() {
        try { d = state.api.lead(id); error = null } catch (e: com.knightdx91.websitebusiness.net.Api.Unauthorized) { state.signOut() } catch (e: Exception) { error = e.message }
    }
    LaunchedEffect(id) { load() }
    LifecycleResumeEffect(id) { scope.launch { load() }; onPauseOrDispose {} }

    fun greeting(): String {
        val me = if (isOwner) (meta?.callerName?.ifBlank { null } ?: meta?.meName ?: "") else (meta?.meName ?: "")
        val co = meta?.companyName?.ifBlank { null }
        return "Hi, this is ${me.ifBlank { "me" }}${if (co != null) " with $co" else ""}."
    }

    fun textPreview() {
        val l = d?.lead ?: return
        scope.launch {
            try {
                val url = state.api.shareLink(l.id)
                runCatching { state.api.logCall(l.id, "link_sent", "Texted the preview link", null) }
                context.sms(l.phone, "${greeting()} Here's the free preview of a website we built for ${l.name}: $url")
            } catch (e: Exception) { context.toast(e.message ?: "Couldn't make the link") }
        }
    }

    fun copyPreview() {
        val l = d?.lead ?: return
        scope.launch {
            try {
                val url = state.api.shareLink(l.id)
                runCatching { state.api.logCall(l.id, "link_sent", "Copied the preview link", null) }
                (context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager).setPrimaryClip(ClipData.newPlainText("Preview link", url))
                context.toast("Link copied (good for 14 days)")
            } catch (e: Exception) { context.toast(e.message ?: "Couldn't make the link") }
        }
    }

    fun saveLog() {
        val l = d?.lead ?: return
        val o = outcome ?: return context.toast("Pick how the call went")
        busy = true
        scope.launch {
            try {
                state.api.logCall(l.id, o, note.trim(), if (o == "callback") callback ?: dayFromNow(1) else callback)
                note = ""; outcome = null; callback = null
                context.toast("Logged")
                load()
            } catch (e: Exception) { context.toast(e.message ?: "Couldn't save") } finally { busy = false }
        }
    }

    fun setStatus(s: String) {
        val l = d?.lead ?: return
        scope.launch { try { state.api.setStatus(l.id, s); load() } catch (e: Exception) { context.toast(e.message ?: "Couldn't change") } }
    }

    fun tap(signupId: String) {
        val l = d?.lead ?: return
        scope.launch {
            try {
                val r = state.api.startTap(l.id, signupId)
                if (r.optBoolean("alreadyPaid")) { context.toast("Already paid ✅"); load(); return@launch }
                context.startActivity(TapToPayActivity.intent(context, r.getString("token"), state.api.origin))
            } catch (e: Exception) { context.toast(e.message ?: "Couldn't start the payment") }
        }
    }

    fun openSignup(planId: String) {
        val l = d?.lead ?: return
        scope.launch {
            try {
                val r = state.api.signupLink(l.id, planId)
                val url = r.getString("url") + (if (meta?.tapReady == true) "?tap=1" else "")
                nav.navigate(webRoute(url.removePrefix(state.api.origin)))
            } catch (e: Exception) { context.toast(e.message ?: "Couldn't open the sign-up page") }
        }
    }

    Scaffold(topBar = {
        TopAppBar(title = { Text(d?.lead?.name ?: "Lead", maxLines = 1) }, navigationIcon = { IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } })
    }) { pad ->
        val detail = d
        if (detail == null) {
            Column(Modifier.fillMaxSize().padding(pad).padding(24.dp)) { if (error != null) Text(error!!, color = MaterialTheme.colorScheme.error) else CircularProgressIndicator() }
            return@Scaffold
        }
        val l = detail.lead
        LazyColumn(Modifier.fillMaxSize().padding(pad), contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        Row { StatusChip(l); Spacer(Modifier.weight(1f)); Text(SALES_LABEL[l.salesStatus] ?: l.salesStatus, fontWeight = FontWeight.SemiBold) }
                        Text(listOfNotNull(detail.variantLabel ?: categoryLabel(l.category), l.reason).joinToString(" · "), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        l.address?.let { Text(it, style = MaterialTheme.typography.bodyMedium) }
                        l.phone?.let { Text(it, style = MaterialTheme.typography.bodyMedium) }
                        l.rating?.let { Text("★ ${"%.1f".format(it)} · ${l.reviewCount} Google reviews", style = MaterialTheme.typography.bodySmall) }
                        if (l.previewOpens > 0) Text("👀 Opened their preview ${l.previewOpens}× · last ${ago(l.previewOpenedAt)}", style = MaterialTheme.typography.bodySmall, color = Good)
                        if (l.followUp != null) Text("📅 Call back ${niceDay(l.followUp)}", style = MaterialTheme.typography.bodySmall, color = Warn)
                        detail.cadenceNext?.let { Text("Next step: $it", style = MaterialTheme.typography.bodySmall) }
                        Spacer(Modifier.height(10.dp))
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Button(onClick = { context.dial(l.phone) }) { Text("📞 Call") }
                            OutlinedButton(onClick = { context.sms(l.phone, greeting()) }) { Text("💬 Text") }
                            OutlinedButton(onClick = { context.directions(l.address, l.lat, l.lng) }) { Text("🗺️ Directions") }
                            if (l.ready) OutlinedButton(onClick = { nav.navigate("pitch/${l.id}") }) { Text("📋 Call guide") }
                            if (l.ready) OutlinedButton(onClick = { nav.navigate("preview/${l.id}") }) { Text("👁️ Preview") }
                            if (l.ready) OutlinedButton(onClick = { nav.navigate(webRoute("/#/walkin/${l.id}")) }) { Text("🚶 In person") }
                            OutlinedButton(onClick = { nav.navigate("tasks/${l.id}") }) { Text("📝 Task") }
                            if (isOwner && l.ready) OutlinedButton(onClick = { nav.navigate("edit/${l.id}") }) { Text("✏️ Edit site") }
                            if (isOwner && l.ready) OutlinedButton(onClick = { nav.navigate(webRoute("/#/lead/${l.id}")) }) { Text("⋯ More") }
                        }
                        if (l.ready) {
                            Spacer(Modifier.height(6.dp))
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedButton(onClick = { textPreview() }) { Text("Text preview link") }
                                TextButton(onClick = { copyPreview() }) { Text("Copy link") }
                            }
                        }
                        l.liveUrl?.let { TextButton(onClick = { context.openUrl(it) }) { Text("● Live: $it") } }
                    }
                }
            }
            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        Text("Log this call", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            OUTCOME_LABEL.forEach { (k, label) -> FilterChip(selected = outcome == k, onClick = { outcome = k; if (k == "callback" && callback == null) callback = dayFromNow(1) }, label = { Text(label) }) }
                        }
                        OutlinedTextField(note, { note = it }, label = { Text("Note (optional)") }, modifier = Modifier.fillMaxWidth().padding(top = 6.dp), minLines = 2)
                        Text("Call back:", style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(top = 8.dp))
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            listOf("Tomorrow" to 1, "In 3 days" to 3, "Next week" to 7, "In 2 weeks" to 14).forEach { (label, days) ->
                                val day = dayFromNow(days)
                                FilterChip(selected = callback == day, onClick = { callback = if (callback == day) null else day }, label = { Text(label) })
                            }
                        }
                        Button(onClick = { saveLog() }, enabled = !busy && outcome != null, modifier = Modifier.padding(top = 10.dp)) { Text("Save") }
                    }
                }
            }
            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        Text(if (detail.signups.isNotEmpty()) "Signed up" else "Sign them up", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        detail.signups.forEach { s ->
                            Spacer(Modifier.height(6.dp))
                            Text("✍️ ${s.planName}${s.billingLabel?.let { " · $it" } ?: ""}", fontWeight = FontWeight.SemiBold)
                            s.billingDetail?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
                            if (s.extras.isNotEmpty()) Text("Extras: ${s.extras.joinToString(", ")}", style = MaterialTheme.typography.bodySmall)
                            Text("${s.signerName}${s.signerEmail?.let { " · $it" } ?: ""} · ${ago(s.createdAt)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(if (s.paid) "✅ Paid" else if (s.invoice) "Invoice: not paid yet" else "⚠️ Payment not finished", color = if (s.paid) Good else Warn, style = MaterialTheme.typography.bodyMedium)
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                if (!s.paid && !s.invoice && isOwner && meta?.tapReady == true && s.dueCents >= 50) Button(onClick = { tap(s.id) }) { Text("💳 Take payment by tap · ${money(s.dueCents)}") }
                                TextButton(onClick = { context.openUrl("${state.api.origin}/api/agreements/s/${s.id}.pdf") }) { Text("⬇ Agreement PDF") }
                            }
                            HorizontalDivider(Modifier.padding(vertical = 6.dp))
                        }
                        if (meta != null && meta.plans.isNotEmpty()) {
                            Text(if (detail.signups.isNotEmpty()) "Send a new link to change plans." else "Pick a plan: they choose how to pay, read the agreement, sign and pay, on your phone or theirs.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 6.dp)) {
                                OutlinedButton(onClick = { nav.navigate(webRoute("/#/plans/${l.id}")) }) { Text("📋 Show them the plans") }
                                OutlinedButton(onClick = { nav.navigate(webRoute("/api/contract?lead=${l.id}")) }) { Text("📄 Agreement") }
                            }
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 6.dp)) {
                                meta.plans.forEach { p -> Button(onClick = { openSignup(p.id) }, enabled = l.ready) { Text("${p.name} · ${moneyDollars(p.monthly)}/mo") } }
                            }
                        }
                    }
                }
            }
            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        Text("Status", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            listOf("new", "shown", "sold", "not_interested").forEach { s ->
                                FilterChip(selected = l.salesStatus == s, onClick = { if (l.salesStatus != s && l.salesStatus != "live") setStatus(s) }, label = { Text(SALES_LABEL[s] ?: s) }, enabled = l.salesStatus != "live")
                            }
                        }
                    }
                }
            }
            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        Text("Call log", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        if (detail.notes.isEmpty()) Text("No calls logged yet.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        detail.notes.take(40).forEach { n ->
                            Column(Modifier.padding(top = 8.dp)) {
                                Text("${n.outcome?.let { OUTCOME_LABEL[it] ?: it.replace('_', ' ') }?.let { "$it · " } ?: ""}${n.author} · ${dateTime(n.createdAt)}", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                if (n.body.isNotBlank()) Text(n.body, style = MaterialTheme.typography.bodyMedium)
                            }
                        }
                    }
                }
            }
        }
    }
}
