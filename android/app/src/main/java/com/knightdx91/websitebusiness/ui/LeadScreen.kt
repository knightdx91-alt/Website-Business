package com.knightdx91.websitebusiness.ui

import android.content.ContentValues
import android.content.Context
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.navigation.NavHostController
import com.knightdx91.websitebusiness.AppState
import com.knightdx91.websitebusiness.net.Api
import com.knightdx91.websitebusiness.net.AppContent
import com.knightdx91.websitebusiness.net.Content
import com.knightdx91.websitebusiness.net.DomainInfo
import com.knightdx91.websitebusiness.net.LeadFull
import com.knightdx91.websitebusiness.net.MonthStats
import com.knightdx91.websitebusiness.net.SiteStats
import com.knightdx91.websitebusiness.net.addDomain
import com.knightdx91.websitebusiness.net.clearFollowUp
import com.knightdx91.websitebusiness.net.companyReviewUrl
import com.knightdx91.websitebusiness.net.deleteLead
import com.knightdx91.websitebusiness.net.deleteNote
import com.knightdx91.websitebusiness.net.domain
import com.knightdx91.websitebusiness.net.extrasLink
import com.knightdx91.websitebusiness.net.clientLink
import com.knightdx91.websitebusiness.net.boardLink
import com.knightdx91.websitebusiness.net.revokeClientLink
import com.knightdx91.websitebusiness.net.forgetSiteImport
import com.knightdx91.websitebusiness.net.fill
import com.knightdx91.websitebusiness.net.flyerLeft
import com.knightdx91.websitebusiness.net.leadFull
import com.knightdx91.websitebusiness.net.portalUrl
import com.knightdx91.websitebusiness.net.publish
import com.knightdx91.websitebusiness.net.removeDomain
import com.knightdx91.websitebusiness.net.restyle
import com.knightdx91.websitebusiness.net.webcheck
import com.knightdx91.websitebusiness.net.retryBuild
import com.knightdx91.websitebusiness.net.rewrite
import com.knightdx91.websitebusiness.net.setLook
import com.knightdx91.websitebusiness.net.setPaid
import com.knightdx91.websitebusiness.net.refund
import com.knightdx91.websitebusiness.net.refundable
import com.knightdx91.websitebusiness.net.RefundInfo
import com.knightdx91.websitebusiness.net.siteStats
import com.knightdx91.websitebusiness.tap.TapToPayActivity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.IOException
import java.text.DateFormatSymbols
import java.util.Locale

/** The native PDF viewer's route for a PDF behind the login (`/api/....pdf`), shown with print and share. */
fun pdfNav(path: String, title: String): String = "pdf?path=" + Uri.encode(path) + "&title=" + Uri.encode(title)

/** A yes/no question before something that costs money, changes a site or can't be undone. */
private data class Ask(val title: String, val text: String, val button: String, val danger: Boolean = false, val action: () -> Unit)

private val LOST_REASONS = listOf("price" to "Price", "has_someone" to "Has someone", "no_need" to "No need", "timing" to "Timing", "other" to "Other")

private val STATUS_ASK = mapOf(
    "sold" to "Mark this lead as Sold? (Normally you'd log the call instead.)",
    "not_interested" to "Mark as Not interested? They drop off the call lists.",
    "new" to "Move this lead back to New?",
)

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun LeadScreen(state: AppState, nav: NavHostController, id: String) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var d by remember { mutableStateOf<LeadFull?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var outcome by remember { mutableStateOf<String?>(null) }
    var lostReason by remember { mutableStateOf<String?>(null) }
    var note by remember { mutableStateOf("") }
    var callback by remember { mutableStateOf<String?>(null) }
    /** The action in flight, so its button (and the others that would clash) wait. */
    var busy by remember { mutableStateOf<String?>(null) }
    var ask by remember { mutableStateOf<Ask?>(null) }
    var importSite by remember { mutableStateOf(false) }
    var editingContact by remember { mutableStateOf(false) }
    var contactDraft by remember { mutableStateOf("") }
    var bestTimeDraft by remember { mutableStateOf("") }
    var reviewUrl by remember { mutableStateOf<String?>(null) }
    var stats by remember { mutableStateOf<SiteStats?>(null) }
    var statsError by remember { mutableStateOf<String?>(null) }
    var dom by remember { mutableStateOf<DomainInfo?>(null) }
    var domError by remember { mutableStateOf<String?>(null) }
    var domDraft by remember { mutableStateOf("") }
    val meta = state.meta
    val isOwner = meta?.isOwner == true
    val muted = MaterialTheme.colorScheme.onSurfaceVariant

    suspend fun load() {
        try { d = state.api.leadFull(id); error = null } catch (e: Api.Unauthorized) { state.signOut() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { error = e.message }
    }
    LaunchedEffect(id) { load() }
    LifecycleResumeEffect(id) { scope.launch { load() }; onPauseOrDispose {} }
    // A site still building: check again every 5 seconds until it's ready (or failed).
    LaunchedEffect(d?.lead?.status) {
        while (d?.lead?.status == "queued" || d?.lead?.status == "building") { delay(5_000); load() }
    }
    val client = d?.lead?.salesStatus == "sold" || d?.lead?.salesStatus == "live"
    LaunchedEffect(client) { if (client) reviewUrl = runCatching { state.api.companyReviewUrl() }.getOrNull() }
    val liveOwner = isOwner && d?.lead?.salesStatus == "live"
    LaunchedEffect(liveOwner) {
        if (!liveOwner) return@LaunchedEffect
        try { stats = state.api.siteStats(id); statsError = null } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { statsError = e.message ?: "Couldn't load the visits" }
        try { dom = state.api.domain(id); domError = null } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { domError = e.message ?: "Couldn't check the domain" }
    }

    suspend fun content(): Content = AppContent.load(state.api)
    val greeting = greetingFor(meta)

    /** Runs an action with its button disabled; errors become a toast. */
    fun act(key: String, block: suspend () -> Unit) {
        if (busy != null) return
        busy = key
        scope.launch {
            try { block() } catch (e: Api.Unauthorized) { state.signOut() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { context.toast(e.message ?: "Something went wrong") } finally { busy = null }
        }
    }

    fun logSent(which: String) { scope.launch { runCatching { state.api.logCall(id, "link_sent", which, null) } } }

    fun textPreview() {
        val l = d ?: return
        act("share") {
            val url = state.api.shareLink(id)
            logSent("Text preview link")
            context.sms(l.lead.phone, content().shareText.fill("greeting" to greeting, "name" to l.name, "url" to url))
        }
    }

    fun copyPreview() {
        val l = d ?: return
        act("share") {
            val url = state.api.shareLink(id)
            logSent("Copy message + link")
            context.copyText("Preview link", content().shareText.fill("greeting" to greeting, "name" to l.name, "url" to url))
            context.toast("Message with the preview link copied. Paste it anywhere.")
        }
    }

    fun followUp(i: Int) {
        val l = d ?: return
        act("share") {
            val f = content().followUps.getOrNull(i) ?: throw IOException("That follow-up isn't available")
            val url = state.api.shareLink(id)
            logSent("Follow-up: ${f.label}")
            context.sms(l.lead.phone, f.text.fill("greeting" to greeting, "name" to l.name, "url" to url))
        }
    }

    fun saveLog() {
        val l = d ?: return
        val o = outcome ?: return context.toast("Pick how it went")
        if (o == "not_interested" && lostReason == null) return context.toast("Pick a reason")
        val body = if (o == "not_interested") "Reason: $lostReason. ${note.trim()}".trim() else note.trim()
        act("log") {
            state.api.logCall(l.lead.id, o, body, if (o == "callback") callback ?: dayFromNow(1) else callback)
            note = ""; outcome = null; callback = null; lostReason = null
            context.toast("Logged")
            load()
        }
    }

    fun setStatus(s: String) {
        val go = { act("status") { state.api.setStatus(id, s); load() } }
        val q = STATUS_ASK[s]
        if (q != null) ask = Ask("Sales status", q, "Yes", action = go) else go()
    }

    fun saveContact() {
        act("contact") {
            state.api.contact(id, contactDraft.trim(), bestTimeDraft.trim())
            editingContact = false
            context.toast("Saved")
            load()
        }
    }

    var refundFor by remember { mutableStateOf<String?>(null) }
    refundFor?.let { sid -> RefundDialog(state, sid, onDone = { refundFor = null; scope.launch { load() } }, onClose = { refundFor = null }) }

    fun tap(signupId: String) {
        act("tap") {
            val r = state.api.startTap(id, signupId)
            if (r.optBoolean("alreadyPaid")) { context.toast("Already paid ✅"); load(); return@act }
            context.startActivity(TapToPayActivity.intent(context, r.getString("token"), state.api.origin))
        }
    }

    fun flyer() {
        scope.launch {
            // Leaving a flyer marks a New lead Shown (callers may); the PDF itself has no side effects.
            runCatching { state.api.flyerLeft(id) }
            nav.navigate(pdfNav("/api/leads/$id/flyer.pdf", "Flyer"))
        }
    }

    fun textReport() {
        val l = d ?: return
        val st = stats ?: return context.toast("The visit counts haven't loaded yet")
        val t = if (st.lastMonth.views > 0 || st.thisMonth.views == 0) st.lastMonth else st.thisMonth
        val from = meta?.companyName?.ifBlank { null }?.let { " from $it" } ?: ""
        val requests = if (t.requests > 0) ", and ${t.requests} sent a request through the site" else ""
        context.sms(l.lead.phone, "Hi! Your website report for ${l.name}, ${monthName(t.label)}$from: ${t.views} visits, ${t.calls} people tapped Call, ${t.directions} got directions$requests. Let us know if you'd like anything updated!")
    }

    fun downloadZip() {
        val l = d ?: return
        act("zip") {
            val bytes = state.api.bytes("/api/leads/$id/zip")
            val name = l.name.replace(Regex("[^a-z0-9]+", RegexOption.IGNORE_CASE), "-").lowercase().trim('-').ifBlank { "site" } + ".zip"
            val where = saveToDownloads(context, name, bytes)
            context.toast("Saved to $where")
        }
    }

    Scaffold(topBar = {
        TopAppBar(title = { Text(d?.name ?: "Lead", maxLines = 1) }, navigationIcon = { IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } })
    }) { pad ->
        val detail = d
        if (detail == null) {
            Column(Modifier.fillMaxSize().padding(pad).padding(24.dp)) { if (error != null) Text(error!!, color = MaterialTheme.colorScheme.error) else CircularProgressIndicator() }
            return@Scaffold
        }
        val l = detail.lead
        val ready = l.ready
        val open = l.salesStatus == "new" || l.salesStatus == "shown"
        val live = l.salesStatus == "live"

        if (importSite) detail?.website?.let { site ->
            SiteImportDialog(state.api, id, site) { changed -> importSite = false; if (changed) scope.launch { load() } }
        }
        ask?.let { a ->
            AlertDialog(
                onDismissRequest = { ask = null },
                title = { Text(a.title) },
                text = { Text(a.text) },
                confirmButton = { TextButton(onClick = { ask = null; a.action() }) { Text(a.button, color = if (a.danger) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary) } },
                dismissButton = { TextButton(onClick = { ask = null }) { Text("Cancel") } },
            )
        }

        LazyColumn(Modifier.fillMaxSize().padding(pad), contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            // ---- header: who they are, how to reach them ----
            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        Row { StatusChip(l); Spacer(Modifier.weight(1f)); Text(SALES_LABEL[l.salesStatus] ?: l.salesStatus, fontWeight = FontWeight.SemiBold) }
                        Text(listOfNotNull(detail.detail.variantLabel ?: categoryLabel(l.category), l.reason).joinToString(" · "), style = MaterialTheme.typography.bodyMedium, color = muted)
                        l.foundUrl?.let { url -> Text("🔗 Found page: ${l.foundHost ?: url} (not linked from their Google listing)", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary, modifier = Modifier.clickable { context.startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url))) }) }
                        if (isOwner && l.salesStatus != "live") TextButton(onClick = { act("webcheck") { val r = state.api.webcheck(id); context.toast(if (r.optBoolean("found")) "Found: ${r.optString("label")}" else "Nothing found beyond their Google listing"); load() } }, enabled = busy == null, contentPadding = PaddingValues(0.dp)) { Text(if (busy == "webcheck") "Searching the web…" else "🔎 Re-check website") }
                        if (isOwner && detail.website != null && l.salesStatus != "live") TextButton(onClick = { importSite = true }, enabled = busy == null, contentPadding = PaddingValues(0.dp)) { Text("⬇️ Import their website (text + photos)") }
                        if (isOwner && detail.existingSiteLine != null && l.salesStatus != "live") TextButton(onClick = {
                            ask = Ask("Not their website", "Remove the text and photos taken from that page, forget the page, and rewrite the site? The Google photo comes back as the main photo.", "Remove", danger = true) {
                                act("forgetsite") { state.api.forgetSiteImport(id); context.toast("Removed. Rebuilding with fresh text…"); delay(1_500); load() }
                            }
                        }, enabled = busy == null, contentPadding = PaddingValues(0.dp)) { Text("✖ Not their website: remove the imported text and photos") }
                        detail.existingSiteLine?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = muted) }
                        if (detail.existingSiteLine == null) detail.siteImportError?.let { Text("Couldn't read their site from the server: $it. Use Import their website.", style = MaterialTheme.typography.bodySmall, color = Warn) }
                        l.address?.let { Text(it, style = MaterialTheme.typography.bodyMedium) }
                        (detail.phoneDisplay ?: l.phone)?.let { Text(it, style = MaterialTheme.typography.bodyMedium) }
                        l.rating?.let { Text("★ ${"%.1f".format(it)} · ${l.reviewCount} Google reviews", style = MaterialTheme.typography.bodySmall) }
                        if (l.followUp != null) Text("📅 Call back ${niceDay(l.followUp)}", style = MaterialTheme.typography.bodySmall, color = Warn)
                        // "👤 Ask for: Maria · mornings" with an inline edit.
                        if (editingContact) {
                            OutlinedTextField(contactDraft, { contactDraft = it.take(80) }, label = { Text("Ask for") }, placeholder = { Text("Owner's name") }, singleLine = true, modifier = Modifier.fillMaxWidth().padding(top = 6.dp))
                            OutlinedTextField(bestTimeDraft, { bestTimeDraft = it.take(80) }, label = { Text("Best time") }, placeholder = { Text("e.g. weekday mornings") }, singleLine = true, modifier = Modifier.fillMaxWidth().padding(top = 6.dp))
                            Row(Modifier.padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Button(onClick = { saveContact() }, enabled = busy == null) { Text("Save") }
                                OutlinedButton(onClick = { editingContact = false }) { Text("Cancel") }
                            }
                        } else {
                            val bits = listOfNotNull(l.contact?.let { "Ask for: $it" }, l.bestTime)
                            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 4.dp)) {
                                Text(if (bits.isEmpty()) "👤 Who should you ask for?" else "👤 ${bits.joinToString(" · ")}", style = MaterialTheme.typography.bodyMedium, color = if (bits.isEmpty()) muted else MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))
                                TextButton(onClick = { contactDraft = l.contact ?: ""; bestTimeDraft = l.bestTime ?: ""; editingContact = true }, contentPadding = PaddingValues(horizontal = 8.dp)) { Text(if (bits.isEmpty()) "Add" else "Edit") }
                            }
                        }
                        Spacer(Modifier.height(6.dp))
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            if (ready) Button(onClick = { nav.navigate("pitch/${l.id}") }) { Text("📞 Call guide") }
                            if (ready && open) Button(onClick = { nav.navigate("walkin/${l.id}") }) { Text("🚶 In-person guide") }
                            if (ready) OutlinedButton(onClick = { context.dial(l.phone) }) { Text("📞 Call") } else Button(onClick = { context.dial(l.phone) }) { Text("📞 Call") }
                            OutlinedButton(onClick = { context.sms(l.phone, greeting) }) { Text("💬 Text") }
                            OutlinedButton(onClick = { context.directions(l.address, l.lat, l.lng) }) { Text("🗺️ Directions") }
                            detail.mapsUrl?.let { u -> OutlinedButton(onClick = { context.openUrl(u) }) { Text("Google listing") } }
                            if (open) OutlinedButton(onClick = { nav.navigate("playbook") }) { Text("💬 Plans & answers") }
                            OutlinedButton(onClick = { nav.navigate("tasks/${l.id}") }) { Text("📝 Task") }
                            if (isOwner && (l.salesStatus == "sold" || live) && ready) OutlinedButton(onClick = { nav.navigate("gbp/${l.id}") }) { Text("🔎 Google profile") }
                        }
                    }
                }
            }

            // ---- log this call (first on a phone, so a call can be logged without scrolling) ----
            if (!live) item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        Text("Log a call or visit", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            OUTCOME_LABEL.forEach { (k, label) -> FilterChip(selected = outcome == k, onClick = { outcome = k; if (k == "callback" && callback == null) callback = dayFromNow(1); if (k != "not_interested") lostReason = null }, label = { Text(label) }) }
                        }
                        if (outcome == "not_interested") {
                            Text("Why not?", style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(top = 8.dp))
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                LOST_REASONS.forEach { (k, label) -> FilterChip(selected = lostReason == k, onClick = { lostReason = k }, label = { Text(label) }) }
                            }
                        }
                        OutlinedTextField(note, { note = it }, label = { Text("Note (optional)") }, placeholder = { Text("Who you talked to, what they said, best time to call…") }, modifier = Modifier.fillMaxWidth().padding(top = 6.dp), minLines = 2)
                        Text("Call back:", style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(top = 8.dp))
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            listOf("Tomorrow" to 1, "In 3 days" to 3, "Next week" to 7, "In 2 weeks" to 14).forEach { (label, days) ->
                                val day = dayFromNow(days)
                                FilterChip(selected = callback == day, onClick = { callback = if (callback == day) null else day }, label = { Text(label) })
                            }
                        }
                        Button(onClick = { saveLog() }, enabled = busy == null && outcome != null, modifier = Modifier.padding(top = 10.dp)) { Text("Save") }
                        Text("No answer schedules a callback for tomorrow unless you pick a day. Sold and Not interested clear the callback. If they ask not to be called again, tap Not interested.", style = MaterialTheme.typography.bodySmall, color = muted, modifier = Modifier.padding(top = 6.dp))
                    }
                }
            }

            // ---- sales status + cadence ----
            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        Text("Sales status", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        when {
                            live -> Text("● Live", color = Good, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 4.dp))
                            isOwner -> FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                listOf("new", "shown", "sold", "not_interested").forEach { s ->
                                    FilterChip(selected = l.salesStatus == s, onClick = { if (l.salesStatus != s) setStatus(s) }, label = { Text(SALES_LABEL[s] ?: s) }, enabled = busy == null)
                                }
                            }
                            else -> {
                                Text(SALES_LABEL[l.salesStatus] ?: l.salesStatus, color = if (l.salesStatus == "sold") Good else MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 4.dp))
                                Text("Log the call above to update it.", style = MaterialTheme.typography.bodySmall, color = muted)
                            }
                        }
                        val cad = detail.cadence
                        if (cad != null && open && ready) {
                            HorizontalDivider(Modifier.padding(vertical = 8.dp))
                            Text("Day ${cad.day} since shown · Next: ${cad.next}", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                            val t = cad.next.lowercase()
                            val (label, go) = when {
                                Regex("not interested|close|give up|let .*go").containsMatchIn(t) -> "✋ Not interested" to { outcome = "not_interested"; context.toast("Pick a reason in Log this call") }
                                Regex("last check").containsMatchIn(t) -> "👋 Last check-in text" to { followUp(2) }
                                Regex("in person|visit|walk|stop by|drop by").containsMatchIn(t) -> "🚶 In-person guide" to { nav.navigate("walkin/${l.id}") }
                                Regex("text|follow").containsMatchIn(t) -> "💬 Follow-up text" to { followUp(0) }
                                else -> "📞 Call guide" to { nav.navigate("pitch/${l.id}") }
                            }
                            OutlinedButton(onClick = go, enabled = busy == null, modifier = Modifier.padding(top = 4.dp)) { Text(label) }
                        }
                    }
                }
            }

            // ---- website: build state, preview, flyer, share ----
            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        Text("Website", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        when (l.status) {
                            "failed" -> {
                                Text("Build failed", color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 4.dp))
                                detail.error?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = muted) }
                                if (isOwner) OutlinedButton(onClick = { act("retry") { state.api.retryBuild(id); context.toast("Rebuilding…"); delay(1_500); load() } }, enabled = busy == null, modifier = Modifier.padding(top = 6.dp)) { Text("Try again") }
                                else Text("The owner can rebuild it.", style = MaterialTheme.typography.bodySmall, color = muted)
                            }
                            "queued", "building" -> Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 8.dp)) {
                                CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                                Spacer(Modifier.width(10.dp))
                                Text("Building… this takes about a minute.")
                            }
                        }
                        if (ready) {
                            if (!(isOwner && !live)) Text("Design: ${detail.designName}", style = MaterialTheme.typography.bodySmall, color = muted, modifier = Modifier.padding(top = 2.dp))
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 8.dp)) {
                                Button(onClick = { nav.navigate("preview/${l.id}") }) { Text("Preview") }
                                if (isOwner) OutlinedButton(onClick = { nav.navigate("edit/${l.id}") }) { Text("Edit") }
                                if (!live) OutlinedButton(onClick = { flyer() }) { Text("Leave-behind flyer (QR)") }
                            }
                            if (!live) {
                                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 8.dp)) {
                                    OutlinedButton(onClick = { textPreview() }, enabled = busy == null) { Text("💬 Text preview link") }
                                    OutlinedButton(onClick = { copyPreview() }, enabled = busy == null) { Text("🔗 Copy message + link") }
                                }
                                Text("Only text the link after they say it's OK. It works for 14 days, no login needed.", style = MaterialTheme.typography.bodySmall, color = muted, modifier = Modifier.padding(top = 4.dp))
                                var moreTexts by remember { mutableStateOf(false) }
                                TextButton(onClick = { moreTexts = !moreTexts }, contentPadding = PaddingValues(0.dp)) { Text(if (moreTexts) "▾ Follow-up texts" else "▸ Follow-up texts") }
                                if (moreTexts) {
                                    var followUps by remember { mutableStateOf<List<String>>(emptyList()) }
                                    LaunchedEffect(Unit) { followUps = runCatching { content().followUps.map { it.label } }.getOrDefault(listOf("👀 Did you get a look?", "🙋 Any questions?", "👋 Last check-in")) }
                                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                        followUps.forEachIndexed { i, label -> OutlinedButton(onClick = { followUp(i) }, enabled = busy == null) { Text(label) } }
                                    }
                                    Text("Each one opens a text with a fresh preview link. Send it yourself; skip it if they asked you to stop.", style = MaterialTheme.typography.bodySmall, color = muted, modifier = Modifier.padding(top = 4.dp))
                                }
                            }
                            if (l.previewOpens > 0) Text("👀 They opened their preview ${if (l.previewOpens == 1) "once" else "${l.previewOpens} times"}, last ${ago(l.previewOpenedAt)}.", style = MaterialTheme.typography.bodySmall, color = Good, modifier = Modifier.padding(top = 8.dp))
                        }
                        l.liveUrl?.let { u -> TextButton(onClick = { context.openUrl(u) }, contentPadding = PaddingValues(0.dp)) { Text("Live at ${u.removePrefix("https://")}") } }
                    }
                }
            }

            // ---- design (owner, before the site is live) ----
            if (ready && isOwner && !live) item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        Text("🎨 Design", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text("Now: ${detail.designName}", style = MaterialTheme.typography.bodySmall, color = muted)
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 8.dp)) {
                            Button(onClick = { act("design") { state.api.restyle(id); context.toast("New design ready"); load() } }, enabled = busy == null) { Text("Try another design") }
                            OutlinedButton(onClick = { act("design") { state.api.restyle(id, structureOnly = true); context.toast("New structure ready"); load() } }, enabled = busy == null) { Text("Same colors, new structure") }
                        }
                        if (busy == "design") Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 6.dp)) { CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp); Spacer(Modifier.width(8.dp)); Text("Rebuilding the preview…", style = MaterialTheme.typography.bodySmall, color = muted) }
                        if (detail.dnaRecipes.isNotEmpty()) {
                            Text("Or pick a style (keeps the colors)", style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(top = 10.dp))
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                detail.dnaRecipes.forEach { r -> FilterChip(selected = false, onClick = { act("design") { state.api.restyle(id, recipe = r.id); context.toast("${r.name} ready"); load() } }, label = { Text(r.name) }, enabled = busy == null) }
                            }
                        }
                        if (detail.looks.isNotEmpty()) {
                            var expanded by remember { mutableStateOf(false) }
                            val current = detail.looks.firstOrNull { it.id == detail.lookBase }?.name ?: "—"
                            Box(Modifier.fillMaxWidth().padding(top = 10.dp)) {
                                OutlinedButton(onClick = { expanded = true }, enabled = busy == null, modifier = Modifier.fillMaxWidth()) { Text("Colors & fonts: $current", maxLines = 1) }
                                DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                                    detail.looks.forEach { lk ->
                                        DropdownMenuItem(text = { Text(lk.name + (if (lk.id == detail.lookBase) "  ✓" else "")) }, onClick = {
                                            expanded = false
                                            // Keep the layout and structure; only the colors and fonts change.
                                            if (lk.id != detail.lookBase) act("design") { state.api.setLook(id, detail.lookId(lk.id)); context.toast("Colors changed"); load() }
                                        })
                                    }
                                }
                            }
                        }
                        Text("Every part (layout, opening, buttons, services…) can be set by hand in Edit → Design.", style = MaterialTheme.typography.bodySmall, color = muted, modifier = Modifier.padding(top = 8.dp))
                    }
                }
            }

            // ---- sign-up ----
            if (ready) item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        val signups = detail.detail.signups
                        Text(if (signups.isNotEmpty()) "Signed up" else "Sign them up", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        signups.forEach { s ->
                            Spacer(Modifier.height(6.dp))
                            Text("✍️ ${s.planName}${s.billingLabel?.let { " · $it" } ?: ""}", fontWeight = FontWeight.SemiBold)
                            s.billingDetail?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
                            if (s.extras.isNotEmpty()) Text("Extras: ${s.extras.joinToString(", ")}", style = MaterialTheme.typography.bodySmall)
                            if (s.dueCents > 0) Text("Due at sign-up: ${money(s.dueCents)}", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold)
                            Text(listOfNotNull(s.signerName.ifBlank { null }, s.signerEmail, ago(s.createdAt).ifBlank { null }).joinToString(" · "), style = MaterialTheme.typography.bodySmall, color = muted)
                            Text(if (s.paid) "✅ Paid" else if (s.invoice) "Invoice: not paid yet" else "⚠️ Payment not finished", color = if (s.paid) Good else Warn, style = MaterialTheme.typography.bodyMedium)
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                if (!s.paid && !s.invoice && isOwner && meta?.tapReady == true && s.dueCents >= 50) Button(onClick = { tap(s.id) }, enabled = busy == null) { Text("💳 Take payment by tap · ${money(s.dueCents)}") }
                                OutlinedButton(onClick = { nav.navigate(pdfNav("/api/agreements/s/${s.id}.pdf", "Signed agreement")) }) { Text("📄 Signed agreement") }
                                if (s.paid && isOwner) OutlinedButton(onClick = { refundFor = s.id }, enabled = busy == null) { Text("↩ Refund") }
                            }
                            if (!s.paid && !s.invoice && isOwner && meta?.tapReady != true && meta?.tapWhy != null && meta.checkoutOnline) Text("💳 Tap to Pay isn't set up yet: Settings → Tap to Pay.", style = MaterialTheme.typography.bodySmall, color = muted)
                            if (isOwner) {
                                var paid by remember(s.id, s.paid) { mutableStateOf(s.paid) }
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Checkbox(checked = paid, onCheckedChange = { v ->
                                        if (busy == null) {
                                            paid = v
                                            act("paid") { state.api.setPaid(id, s.id, v); context.toast(if (v) "Marked as paid" else "Marked as not paid"); load() }
                                        }
                                    }, enabled = busy == null)
                                    Text("Payment is set up")
                                }
                            }
                            HorizontalDivider(Modifier.padding(vertical = 6.dp))
                        }
                        if (detail.purchases.isNotEmpty()) {
                            Text("Extras bought later", style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(top = 4.dp))
                            detail.purchases.forEach { p ->
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text("${p.items.joinToString(", ")} · ${money(p.dueCents)} · ${if (p.paid) "✅ paid" else "not paid yet"} · ${ago(p.createdAt)}", style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                                    TextButton(onClick = { nav.navigate(pdfNav("/api/agreements/p/${p.id}.pdf", "Agreement")) }, contentPadding = PaddingValues(horizontal = 6.dp)) { Text("📄") }
                                }
                            }
                            HorizontalDivider(Modifier.padding(vertical = 6.dp))
                        }
                        if (meta != null && meta.plans.isNotEmpty()) {
                            Text(if (signups.isNotEmpty()) "Send a new link to change plans." else "Pick a plan. They choose how to pay (yearly, month to month or the standard term), sign with their name and set up automatic payment, on your phone or theirs.", style = MaterialTheme.typography.bodySmall, color = muted)
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 6.dp)) {
                                OutlinedButton(onClick = { nav.navigate("plans/${l.id}") }) { Text("📋 Show them the plans") }
                                if (ready) OutlinedButton(onClick = { nav.navigate("showboard/${l.id}") }) { Text("📋 Show them the ${detail.boardName}") }
                                OutlinedButton(onClick = { nav.navigate(pdfNav("/api/contract.pdf?lead=${l.id}", "Agreement")) }) { Text("📄 Agreement") }
                                OutlinedButton(onClick = { nav.navigate(pdfNav("/api/ach.pdf?lead=${l.id}", "Payment authorization form")) }) { Text("🏦 Payment authorization form") }
                            }
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 6.dp)) {
                                meta.plans.forEach { p ->
                                    if (p.id == "plus") Button(onClick = { nav.navigate("signup/${l.id}?plan=${p.id}") }) { Text("${p.name} · ${moneyDollars(p.monthly)}/mo") }
                                    else OutlinedButton(onClick = { nav.navigate("signup/${l.id}?plan=${p.id}") }) { Text("${p.name} · ${moneyDollars(p.monthly)}/mo") }
                                }
                            }
                        } else Text(if (isOwner) "Add your plans and prices in Settings first." else "The owner hasn't set up plans yet.", style = MaterialTheme.typography.bodySmall, color = muted)
                    }
                }
            }

            // ---- client site: visits, printables, their domain (owner, live) ----
            if (live && isOwner) item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        Text("Client site", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        val st = stats
                        when {
                            st != null -> StatsTable(st)
                            statsError != null -> Text(statsError ?: "", style = MaterialTheme.typography.bodySmall, color = muted)
                            else -> Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 6.dp)) { CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp); Spacer(Modifier.width(8.dp)); Text("Loading visits…", style = MaterialTheme.typography.bodySmall, color = muted) }
                        }
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 10.dp)) {
                            OutlinedButton(onClick = { textReport() }, enabled = stats != null) { Text("Text monthly report") }
                            if (!detail.noReviews) OutlinedButton(onClick = { nav.navigate(pdfNav("/api/leads/${l.id}/reviewcard.pdf", "Review cards")) }) { Text("Review cards (QR)") }
                            OutlinedButton(onClick = { nav.navigate(pdfNav("/api/leads/${l.id}/tents.pdf", "Table tents")) }) { Text("QR table tents") }
                            OutlinedButton(onClick = { nav.navigate(pdfNav("/api/leads/${l.id}/window.pdf", "Window sign")) }) { Text("Window sign (QR)") }
                            OutlinedButton(onClick = { nav.navigate(pdfNav("/api/leads/${l.id}/pricetags.pdf", "QR price tags")) }) { Text("QR price tags") }
                        }
                        Text("Their own domain", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 14.dp))
                        val info = dom
                        when {
                            info == null && domError != null -> Text(domError ?: "", style = MaterialTheme.typography.bodySmall, color = muted)
                            info == null -> Text("Checking…", style = MaterialTheme.typography.bodySmall, color = muted)
                            info.domain != null -> {
                                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 4.dp)) {
                                    Text(info.domain, fontWeight = FontWeight.Bold)
                                    Spacer(Modifier.width(8.dp))
                                    if (info.active) Text("● Working", color = Good, style = MaterialTheme.typography.labelLarge) else Text(info.status ?: "waiting", color = Warn, style = MaterialTheme.typography.labelLarge)
                                }
                                if (!info.active) {
                                    Text("At the company where the domain was bought (GoDaddy, Namecheap…), add this DNS record:", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp))
                                    Text("CNAME · name ${info.recordName} · value ${info.target ?: ""}", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 2.dp))
                                    TextButton(onClick = { context.copyText("DNS value", info.target ?: ""); context.toast("Copied") }, contentPadding = PaddingValues(0.dp)) { Text("Copy the value") }
                                    Text((if (info.bare) "A bare domain (no www) works best if the domain uses Cloudflare's nameservers. Using www.yourdomain.com is easiest. " else "") + "It can take a few hours. HTTPS is set up automatically." + (info.error?.let { " Last check: $it" } ?: ""), style = MaterialTheme.typography.bodySmall, color = muted)
                                }
                                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 6.dp)) {
                                    OutlinedButton(onClick = { act("domain") { dom = state.api.domain(id); domError = null } }, enabled = busy == null) { Text("Check again") }
                                    OutlinedButton(onClick = { ask = Ask("Remove domain", "Remove this domain from the site?", "Remove", danger = true) { act("domain") { state.api.removeDomain(id); dom = DomainInfo(null, null, null, null); context.toast("Removed") } } }, enabled = busy == null, colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)) { Text("Remove") }
                                }
                            }
                            else -> {
                                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 4.dp)) {
                                    OutlinedTextField(domDraft, { domDraft = it }, placeholder = { Text("www.theirbusiness.com") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri), modifier = Modifier.weight(1f))
                                    Spacer(Modifier.width(8.dp))
                                    Button(onClick = { act("domain") { dom = state.api.addDomain(id, domDraft.trim().lowercase()); domDraft = ""; context.toast("Domain added") } }, enabled = busy == null && domDraft.isNotBlank()) { Text("Add") }
                                }
                                Text("They buy the domain (about $10–15 a year, at Cloudflare, GoDaddy or Namecheap), then add it here.", style = MaterialTheme.typography.bodySmall, color = muted, modifier = Modifier.padding(top = 4.dp))
                            }
                        }
                    }
                }
            }

            // ---- the board (any category) ----
            if (ready) item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        Text("📋 ${detail.boardName}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text("Their own page for what's in each tank, case, bench or shelf: name, price, how many, a photo, sold out. No login. Changes show on the website's price page within a minute, and the QR price tags point at it. Set \"What's on it\" in Edit → Live price list.", style = MaterialTheme.typography.bodySmall, color = muted)
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 6.dp)) {
                            OutlinedButton(onClick = { act("clientlink") { val (_, text) = state.api.clientLink(id); context.sms(l.phone, text) } }, enabled = busy == null) { Text("💬 Text them their ${detail.boardName.lowercase()} link") }
                            OutlinedButton(onClick = { act("clientopen") { val (url, _) = state.api.clientLink(id); context.openUrl(url) } }, enabled = busy == null) { Text("Open it here") }
                            OutlinedButton(onClick = { act("boardpitch") { val (_, text) = state.api.boardLink(id); context.sms(l.phone, text) } }, enabled = busy == null) { Text("💬 Text them the ${detail.boardName} page") }
                            if (isOwner) OutlinedButton(onClick = {
                                ask = Ask("Revoke old board links", "Stop every ${detail.boardName.lowercase()} link sent so far? You'll text them a new one.", "Revoke", danger = true) {
                                    act("clientrevoke") { state.api.revokeClientLink(id); context.toast("Old links no longer work. Text them a new one.") }
                                }
                            }, enabled = busy == null) { Text("Revoke old links") }
                        }
                        Text("A tablet beside a tank, case or shelf shows it live and lets staff update it (the 📺 link on each one in the board). Sell it as the Price list plan when they don't want a whole website.", style = MaterialTheme.typography.bodySmall, color = muted, modifier = Modifier.padding(top = 6.dp))
                    }
                }
            }

            // ---- extras, review ask, billing (sold / live) ----
            if (client) item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        Text("🛒 Extras", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text("Text them a link to add extras (photo shoot, Spanish page, social posts…) and pay${if (meta?.checkoutOnline == true) " online" else ""}. Good for 30 days.", style = MaterialTheme.typography.bodySmall, color = muted)
                        OutlinedButton(onClick = {
                            act("extras") {
                                val url = state.api.extrasLink(id)
                                context.sms(l.phone, "$greeting Here's where you can add extras to the ${detail.name} website, like a photo shoot, a Spanish page or social media posts: $url")
                            }
                        }, enabled = busy == null, modifier = Modifier.padding(top = 6.dp)) { Text("💬 Text “Buy extras” link") }
                    }
                }
            }
            if (client && (reviewUrl != null || isOwner)) item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        Text("⭐ Ask for a review", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        val u = reviewUrl
                        if (u == null) Text("Add your Google review link in Settings to text happy clients a review request.", style = MaterialTheme.typography.bodySmall, color = muted)
                        else {
                            Text("Once their site is live and they're happy, a quick Google review helps us win the next client.", style = MaterialTheme.typography.bodySmall, color = muted)
                            OutlinedButton(onClick = { context.sms(l.phone, "$greeting Thanks again for trusting us with the ${detail.name} website! If you have a minute, would you leave us a quick Google review? It really helps a small local business: $u") }, modifier = Modifier.padding(top = 6.dp)) { Text("💬 Text them our review link") }
                        }
                    }
                }
            }
            if (client && isOwner) item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        Text("💳 Billing", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text("Their Stripe billing portal: update the card, see invoices, change or cancel the subscription.", style = MaterialTheme.typography.bodySmall, color = muted)
                        OutlinedButton(onClick = { act("portal") { context.openUrl(state.api.portalUrl(id)) } }, enabled = busy == null, modifier = Modifier.padding(top = 6.dp)) { Text("Open billing portal") }
                    }
                }
            }

            // ---- publish (owner) ----
            if (ready && isOwner) item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        val blockers = detail.blockers
                        Text(if (blockers.isNotEmpty()) "Before you can publish" else "Ready to publish", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        if (blockers.isNotEmpty()) {
                            Bullets(blockers)
                            Text("Fill these in from Edit.", style = MaterialTheme.typography.bodySmall, color = muted, modifier = Modifier.padding(top = 4.dp))
                        } else Text("Everything's confirmed. Publishing puts the site on the internet.", color = muted)
                        if (detail.suggestions.isNotEmpty()) {
                            Text("Good to add (talking points)", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 10.dp))
                            Bullets(detail.suggestions)
                        }
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 10.dp)) {
                            Button(onClick = {
                                ask = Ask("Publish", if (l.liveUrl != null) "Publish your changes to the live site?" else "Put this site on the internet now?", "Publish") {
                                    act("publish") {
                                        val url = state.api.publish(id)
                                        context.toast("Published! It can take a minute to appear.")
                                        if (url.isNotBlank()) context.openUrl(url)
                                        load()
                                    }
                                }
                            }, enabled = blockers.isEmpty() && busy == null, colors = ButtonDefaults.buttonColors(containerColor = Good)) { Text(if (busy == "publish") "Publishing…" else if (l.liveUrl != null) "Republish changes" else "Publish to Cloudflare") }
                            OutlinedButton(onClick = { downloadZip() }, enabled = blockers.isEmpty() && busy == null) { Text(if (busy == "zip") "Downloading…" else "Download zip") }
                        }
                    }
                }
            }

            // ---- call log ----
            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        Text("Calls & notes", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        if (l.followUp != null && open) Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("📅 Call back ${niceDay(l.followUp)}", style = MaterialTheme.typography.bodySmall, color = Warn, modifier = Modifier.weight(1f))
                            TextButton(onClick = { act("follow") { state.api.clearFollowUp(id); context.toast("Callback cleared"); load() } }, enabled = busy == null, contentPadding = PaddingValues(horizontal = 8.dp)) { Text("Clear") }
                        }
                        val notes = detail.detail.notes
                        if (notes.isEmpty()) Text("No calls logged yet.", color = muted)
                        var showAll by remember(notes.size) { mutableStateOf(notes.size <= 3) }
                        (if (showAll) notes else notes.take(3)).forEach { n ->
                            Column(Modifier.padding(top = 8.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text("${n.outcome?.let { OUTCOME_LABEL[it] ?: it.replace('_', ' ') }?.let { "$it · " } ?: ""}${n.author} · ${dateTime(n.createdAt)}", style = MaterialTheme.typography.labelMedium, color = muted, modifier = Modifier.weight(1f))
                                    if (isOwner || n.author == meta?.meName) TextButton(onClick = { ask = Ask("Delete note", "Delete this note?", "Delete", danger = true) { act("note") { state.api.deleteNote(id, n.id); load() } } }, contentPadding = PaddingValues(horizontal = 6.dp)) { Text("Delete", style = MaterialTheme.typography.labelMedium) }
                                }
                                if (n.body.isNotBlank()) Text(n.body, style = MaterialTheme.typography.bodyMedium)
                            }
                        }
                        if (!showAll) TextButton(onClick = { showAll = true }, contentPadding = PaddingValues(0.dp)) { Text("Show all ${notes.size}") }
                    }
                }
            }

            // ---- more (owner) ----
            if (isOwner && (ready || !live)) item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        Text("More", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 6.dp)) {
                            if (ready) OutlinedButton(onClick = {
                                ask = Ask("Rewrite text", "Write new text with AI? Your text edits will be replaced. Facts, photos and menu stay.", "Rewrite") {
                                    act("rewrite") { state.api.rewrite(id); context.toast("Rewriting… check back in a minute."); delay(1_500); load() }
                                }
                            }, enabled = busy == null) { Text("Rewrite text with AI") }
                            if (!live) OutlinedButton(onClick = {
                                ask = Ask("Delete lead", "Delete this lead and its preview site?", "Delete", danger = true) {
                                    act("delete") {
                                        state.api.deleteLead(id)
                                        context.toast("Deleted")
                                        nav.navigate("home") { popUpTo("home") { inclusive = true } }
                                    }
                                }
                            }, enabled = busy == null, colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)) { Text("Delete lead") }
                        }
                    }
                }
            }
        }
    }
}

/** This month so far / last month: visits, calls, directions, requests. */
@Composable
private fun StatsTable(st: SiteStats) {
    val muted = MaterialTheme.colorScheme.onSurfaceVariant
    Column(Modifier.padding(top = 8.dp)) {
        Row(Modifier.fillMaxWidth()) { StatCell("", 2f); StatCell("Visits", 1f, true); StatCell("Calls", 1f, true); StatCell("Directions", 1f, true); StatCell("Requests", 1f, true) }
        StatRow("${monthName(st.thisMonth.label)} so far", st.thisMonth)
        StatRow(monthName(st.lastMonth.label), st.lastMonth)
        Text("Calls and directions are taps on those buttons. Counted without cookies.", style = MaterialTheme.typography.bodySmall, color = muted, modifier = Modifier.padding(top = 6.dp))
    }
}

@Composable
private fun StatRow(label: String, t: MonthStats) {
    Row(Modifier.fillMaxWidth().padding(top = 4.dp)) { StatCell(label, 2f, true); StatCell("${t.views}", 1f); StatCell("${t.calls}", 1f); StatCell("${t.directions}", 1f); StatCell("${t.requests}", 1f) }
}

@Composable
private fun RowScope.StatCell(text: String, weight: Float, bold: Boolean = false) {
    Text(text, style = MaterialTheme.typography.bodySmall, fontWeight = if (bold) FontWeight.SemiBold else FontWeight.Normal, modifier = Modifier.weight(weight))
}

/** "2026-10" → "October". */
private fun monthName(ym: String): String {
    val m = ym.takeLast(2).toIntOrNull() ?: return ym
    return DateFormatSymbols(Locale.US).months.getOrNull(m - 1) ?: ym
}

/** Writes a file into the phone's Downloads folder and answers with where it went. */
private suspend fun saveToDownloads(context: Context, name: String, bytes: ByteArray, mime: String = "application/zip"): String = withContext(Dispatchers.IO) {
    if (Build.VERSION.SDK_INT >= 29) {
        val resolver = context.contentResolver
        val values = ContentValues().apply {
            put(MediaStore.Downloads.DISPLAY_NAME, name)
            put(MediaStore.Downloads.MIME_TYPE, mime)
            put(MediaStore.Downloads.IS_PENDING, 1)
        }
        val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values) ?: throw IOException("Couldn't create the file in Downloads")
        resolver.openOutputStream(uri)?.use { it.write(bytes) } ?: throw IOException("Couldn't write the file")
        values.clear()
        values.put(MediaStore.Downloads.IS_PENDING, 0)
        resolver.update(uri, values, null, null)
        "Downloads/$name"
    } else {
        val dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
        dir.mkdirs()
        val f = File(dir, name)
        f.writeBytes(bytes)
        f.absolutePath
    }
}


/** Refund part or all of a client's payment and, if they're backing out, end the plan. Owner only. */
@Composable
private fun RefundDialog(state: AppState, signupId: String, onDone: () -> Unit, onClose: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var info by remember { mutableStateOf<RefundInfo?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var chargeId by remember { mutableStateOf<String?>(null) }
    var amount by remember { mutableStateOf("") }
    var cancelPlan by remember { mutableStateOf(true) }
    var reason by remember { mutableStateOf("") }
    var working by remember { mutableStateOf(false) }

    LaunchedEffect(signupId) {
        try {
            val r = state.api.refundable(signupId)
            info = r
            val first = r.charges.firstOrNull { it.refundableCents > 0 }
            chargeId = first?.id
            amount = first?.let { String.format(java.util.Locale.US, "%.2f", it.refundableCents / 100.0) } ?: ""
            cancelPlan = r.subscriptionId != null
        } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { error = e.message ?: "Couldn't load the payments" }
    }

    val cents = ((amount.toDoubleOrNull() ?: 0.0) * 100).toLong()
    val charge = info?.charges?.firstOrNull { it.id == chargeId }
    val full = charge != null && cents >= charge.refundableCents

    AlertDialog(
        onDismissRequest = { if (!working) onClose() },
        title = { Text("Refund") },
        text = {
            Column {
                val i = info
                when {
                    error != null -> Text(error!!, color = MaterialTheme.colorScheme.error)
                    i == null -> Text("Loading their payments…")
                    i.charges.none { it.refundableCents > 0 } -> Text(if (i.charges.isEmpty()) "No Stripe payment on file for this sign-up (paid by invoice or marked by hand)." else "Everything they paid has already been refunded.")
                    else -> {
                        if (i.charges.size > 1) {
                            Text("Which payment:", style = MaterialTheme.typography.labelLarge)
                            i.charges.filter { it.refundableCents > 0 }.forEach { c ->
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    androidx.compose.material3.RadioButton(selected = chargeId == c.id, onClick = { chargeId = c.id; amount = String.format(java.util.Locale.US, "%.2f", c.refundableCents / 100.0) })
                                    Text("${money(c.refundableCents)} · ${dateTime(c.whenMs)}${c.card?.let { " · $it" } ?: ""}", style = MaterialTheme.typography.bodySmall)
                                }
                            }
                        } else {
                            val c = i.charges.first { it.refundableCents > 0 }
                            Text("Paid ${money(c.amountCents)} on ${dateTime(c.whenMs)}${c.card?.let { " with $it" } ?: ""}${if (c.refundedCents > 0) " · ${money(c.refundedCents)} already refunded" else ""}", style = MaterialTheme.typography.bodyMedium)
                        }
                        OutlinedTextField(amount, { amount = it.filter { ch -> ch.isDigit() || ch == '.' } }, label = { Text("Amount to refund ($)") }, singleLine = true, modifier = Modifier.fillMaxWidth().padding(top = 8.dp), supportingText = { Text(if (full) "Full refund" else "Partial refund") })
                        if (i.subscriptionId != null) Row(verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(checked = cancelPlan, onCheckedChange = { cancelPlan = it })
                            Text("Also cancel their plan now (no more renewals)")
                        }
                        OutlinedTextField(reason, { reason = it.take(200) }, label = { Text("Reason (goes in the call log)") }, singleLine = true, modifier = Modifier.fillMaxWidth().padding(top = 4.dp))
                        Text(
                            "What they were promised: a full refund if they cancel before the site goes live; monthly charges aren't refunded for part of a month; yearly plans within 30 days get back what they paid minus the months started; one-time extras aren't refunded once delivered unless we made the mistake. Billing mistakes are always refunded in full. Stripe keeps its fee (about 3%). The money shows on their card in 5 to 10 business days.",
                            style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 8.dp),
                        )
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val c = charge ?: return@Button
                    working = true
                    scope.launch {
                        try {
                            val msg = state.api.refund(signupId, c.id, cents, cancelPlan, reason.trim())
                            context.toast(msg.ifBlank { "Refunded" })
                            onDone()
                        } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { context.toast(e.message ?: "Refund failed") } finally { working = false }
                    }
                },
                enabled = !working && charge != null && cents in 1..(charge?.refundableCents ?: 0),
            ) { Text(if (working) "Refunding…" else if (cents > 0) "Refund ${money(cents)}" else "Refund") }
        },
        dismissButton = { TextButton(onClick = onClose, enabled = !working) { Text("Cancel") } },
    )
}
