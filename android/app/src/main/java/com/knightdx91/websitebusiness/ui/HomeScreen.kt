package com.knightdx91.websitebusiness.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.navigation.NavHostController
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import com.knightdx91.websitebusiness.AppState
import com.knightdx91.websitebusiness.net.Lead
import com.knightdx91.websitebusiness.net.Queue
import com.knightdx91.websitebusiness.net.queue
import com.knightdx91.websitebusiness.net.startDismiss
import androidx.compose.material3.TextButton
import kotlinx.coroutines.launch

private val TABS = listOf("new" to "New", "callbacks" to "Callbacks", "activity" to "Activity", "shown" to "Shown", "sold" to "Sold", "live" to "Live")

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun HomeScreen(state: AppState, nav: NavHostController) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var tab by rememberSaveable { mutableStateOf("new") }
    var category by rememberSaveable { mutableStateOf("") }
    var search by rememberSaveable { mutableStateOf("") }
    var leads by remember { mutableStateOf<List<Lead>>(emptyList()) }
    var queue by remember { mutableStateOf<Queue?>(null) }
    var startHidden by rememberSaveable { mutableStateOf(false) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    val meta = state.meta

    suspend fun load() {
        loading = true
        error = null
        try {
            // All four at once over the shared connection; one after another they added up on a cold start.
            coroutineScope {
                val list = async {
                    when (tab) {
                        "callbacks" -> state.api.leads(callbacks = "all", category = category.ifBlank { null })
                        "activity" -> state.api.leads(activity = true, category = category.ifBlank { null })
                        else -> state.api.leads(sales = tab, category = category.ifBlank { null })
                    }
                }
                // The queue (GET /api/queue): every lead that needs something, most urgent first, with its one next step.
                val q = async { runCatching { state.api.queue() }.getOrNull() }
                val unread = async { runCatching { state.api.unreadCount() }.getOrDefault(state.unread) }
                leads = list.await()
                q.await()?.let { queue = it }
                state.unread = unread.await()
            }
        } catch (e: com.knightdx91.websitebusiness.net.Api.Unauthorized) {
            state.signOut()
        } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) {
            error = e.message
        } finally {
            // Also on cancellation (tab switched, screen left mid-load): never leave the spinner on.
            loading = false
        }
    }

    LaunchedEffect(tab, category) { load() }
    // Reload when coming back to the app, but not on the first resume: LaunchedEffect above already loads at start.
    var resumedBefore by remember { mutableStateOf(false) }
    LifecycleResumeEffect(Unit) {
        if (resumedBefore) scope.launch { load() } else resumedBefore = true
        onPauseOrDispose {}
    }

    val shown = remember(leads, search) {
        val q = search.trim().lowercase()
        if (q.isEmpty()) leads else leads.filter { it.name.lowercase().contains(q) || (it.address ?: "").lowercase().contains(q) || phoneDigits(it.phone).contains(q) }
    }
    /** Where a queue row's button goes: the call guide / dialer / walk-in guide here, anything else on the lead page itself. */
    fun stepGo(l: Lead, route: String) {
        when (route) {
            "call" -> if (l.ready) nav.navigate("pitch/${l.id}") else context.dial(l.phone)
            "walkin" -> nav.navigate("walkin/${l.id}")
            "wait" -> nav.navigate("lead/${l.id}")
            else -> nav.navigate("lead/${l.id}?step=$route")
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (meta?.companyName.isNullOrBlank()) "Leads" else "Leads · ${meta?.companyName}") },
                actions = { IconButton(onClick = { scope.launch { load() } }) { Icon(Icons.Default.Refresh, "Refresh") } },
            )
        },
        floatingActionButton = {
            if (meta?.isOwner == true) ExtendedFloatingActionButton(onClick = { nav.navigate("run") }, icon = { Icon(Icons.Default.Search, null) }, text = { Text("Find new leads") })
        },
    ) { pad ->
        // Lead cards flow into two or three columns on the open Fold or a tablet; the header rows always span the width.
        LazyVerticalGrid(columns = GridCells.Adaptive(360.dp), modifier = Modifier.fillMaxSize().padding(pad), contentPadding = PaddingValues(12.dp, 8.dp, 12.dp, 96.dp), verticalArrangement = Arrangement.spacedBy(10.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            item(span = { GridItemSpan(maxLineSpan) }) {
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = { nav.navigate("add") }) { Icon(Icons.Default.Add, null); Spacer(Modifier.width(4.dp)); Text("Add a business") }
                    OutlinedButton(onClick = { nav.navigate("route") }) { Text("🗺️ Walk-in route") }
                    OutlinedButton(onClick = { nav.navigate("training") }) { Text("🎓 Training") }
                    OutlinedButton(onClick = { nav.navigate("guide/words") }) { Text("📖 What the words mean") }
                }
            }
            // ---- Start here: a new teammate's first four things, until done or dismissed (per person, on the server) ----
            val start = meta?.start
            if (start != null && start.show && !startHidden) item(span = { GridItemSpan(maxLineSpan) }) {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        val n = start.lessons.count { it.done }
                        Text("👋 Start here${if (n > 0) " · $n of ${start.lessons.size} done" else ""}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text("Four things and you know the job. Each one takes a few minutes.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        start.lessons.forEachIndexed { i, ls ->
                            Row(Modifier.fillMaxWidth().padding(top = 6.dp).clickable { if (ls.practice && start.practiceLeadId != null) nav.navigate("lead/${start.practiceLeadId}") else nav.navigate("training") }, verticalAlignment = Alignment.CenterVertically) {
                                Text(if (ls.done) "✅" else "${i + 1}.", modifier = Modifier.width(28.dp))
                                Text(ls.title + if (ls.practice) "  (on the practice lead; everything on it is \$1)" else "", style = MaterialTheme.typography.bodyMedium, color = if (ls.done) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface)
                            }
                        }
                        Row(Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(onClick = { nav.navigate("training") }) { Text("🎓 Open Training") }
                            TextButton(onClick = { startHidden = true; scope.launch { runCatching { state.api.startDismiss() } }; context.toast("Training is under the buttons above any time.") }) { Text("Not now") }
                        }
                    }
                }
            }
            // ---- Up next: the queue, most urgent first, each row with its one action ----
            queue?.let { q -> item(span = { GridItemSpan(maxLineSpan) }) {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        Text("📋 Up next${if (q.rows.isNotEmpty()) " · ${q.rows.size}" else ""}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        val c = q.counts
                        fun pl(n: Int, one: String, many: String = one + "s") = "$n ${if (n == 1) one else many}"
                        val bits = listOfNotNull(
                            c["take_payment"]?.takeIf { it > 0 }?.let { pl(it, "payment") + " to finish" },
                            c["callback"]?.takeIf { it > 0 }?.let { pl(it, "callback") },
                            c["opened"]?.takeIf { it > 0 }?.let { pl(it, "opened preview") },
                            c["follow_up"]?.takeIf { it > 0 }?.let { pl(it, "follow-up") },
                            c["publish"]?.takeIf { it > 0 }?.let { pl(it, "site") + " to publish" },
                            c["call"]?.takeIf { it > 0 }?.let { pl(it, "new lead") + " to call" },
                        )
                        if (bits.isNotEmpty()) Text(bits.joinToString(" · "), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        if (q.rows.isEmpty()) Text("Nothing waiting. Pick a New lead below and make a call.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 6.dp))
                        q.rows.forEach { row ->
                            val l = row.lead
                            val st = row.step
                            Column(Modifier.fillMaxWidth().padding(top = 10.dp).clickable { nav.navigate("lead/${l.id}") }) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(l.name, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                                    Text("${STEP_ICON[st.key] ?: ""} ${st.title}", style = MaterialTheme.typography.labelLarge, color = when (st.key) { "take_payment", "callback" -> Warn; "opened", "publish" -> Good; else -> MaterialTheme.colorScheme.onSurfaceVariant }, fontWeight = FontWeight.SemiBold)
                                }
                                Text(listOfNotNull(st.detail.ifBlank { null }, l.contact?.let { "Ask for: $it" }).joinToString(" · "), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Row(Modifier.padding(top = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Button(onClick = { stepGo(l, st.route) }) { Text(if (st.route == "call" && l.ready) "📞 Call guide" else "${STEP_ICON[st.key] ?: ""} ${st.action}") }
                                    if (st.route == "call" && l.ready) OutlinedButton(onClick = { context.dial(l.phone) }) { Text("📞 Call now") }
                                    OutlinedButton(onClick = { nav.navigate("lead/${l.id}") }) { Text("Open") }
                                }
                            }
                        }
                    }
                }
            } }
            item(span = { GridItemSpan(maxLineSpan) }) {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(TABS) { (id, label) -> FilterChip(selected = tab == id, onClick = { tab = id }, label = { Text(label) }) }
                }
            }
            item(span = { GridItemSpan(maxLineSpan) }) {
                OutlinedTextField(search, { search = it }, placeholder = { Text("Search name, street or phone") }, singleLine = true, modifier = Modifier.fillMaxWidth(), leadingIcon = { Icon(Icons.Default.Search, null) })
            }
            if (meta != null) item(span = { GridItemSpan(maxLineSpan) }) {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    item { FilterChip(selected = category.isEmpty(), onClick = { category = "" }, label = { Text("All types") }) }
                    val groups = meta.categories.map { it.category }.distinct().sortedBy { categoryLabel(it).lowercase() }
                    items(groups) { c -> FilterChip(selected = category == c, onClick = { category = if (category == c) "" else c }, label = { Text(categoryLabel(c)) }) }
                }
            }
            if (loading && leads.isEmpty()) item(span = { GridItemSpan(maxLineSpan) }) { Row(Modifier.fillMaxWidth().padding(24.dp), horizontalArrangement = Arrangement.Center) { CircularProgressIndicator() } }
            error?.let { e -> item(span = { GridItemSpan(maxLineSpan) }) { Card { Column(Modifier.padding(14.dp)) { Text(e, color = MaterialTheme.colorScheme.error); Button(onClick = { scope.launch { load() } }, modifier = Modifier.padding(top = 8.dp)) { Text("Try again") } } } } }
            if (!loading && shown.isEmpty() && error == null) item(span = { GridItemSpan(maxLineSpan) }) {
                Text(
                    when (tab) {
                        "new" -> if (meta?.isOwner == true) "No new leads. Tap Find new leads to run a search." else "No new leads right now. Check back after the next run."
                        "callbacks" -> "No callbacks scheduled. Log a call and pick “Call back” to schedule one."
                        "activity" -> "Nothing logged yet. Leads with a call or note, a task, a sign-up, a callback or an opened preview show here, newest first."
                        else -> "Nothing here yet."
                    },
                    color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(12.dp),
                )
            }
            items(shown, key = { it.id }) { l -> LeadCard(l, onOpen = { nav.navigate("lead/${l.id}") }, onCall = { if (l.ready) nav.navigate("pitch/${l.id}") else context.dial(l.phone) }, onPreview = { nav.navigate("preview/${l.id}") }) }
        }
    }
}

@Composable
fun StatusChip(l: Lead) {
    val (text, color) = when {
        l.salesStatus == "live" -> "● Live" to Good
        l.salesStatus == "not_interested" -> "Not interested" to MaterialTheme.colorScheme.onSurfaceVariant
        l.status == "queued" -> "Queued to build" to MaterialTheme.colorScheme.onSurfaceVariant
        l.status == "building" -> "Building the preview" to MaterialTheme.colorScheme.onSurfaceVariant
        l.status == "failed" -> "Preview failed" to MaterialTheme.colorScheme.error
        else -> "Preview ready" to Good
    }
    Text(text, color = color, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
}

@Composable
fun LeadCard(l: Lead, onOpen: () -> Unit, onCall: () -> Unit, onPreview: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth().clickable(onClick = onOpen)) {
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(l.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                StatusChip(l)
            }
            val meta = listOfNotNull(categoryLabel(l.category), l.reason, l.rating?.let { "★ ${"%.1f".format(it)}${if (l.reviewCount > 0) " (${l.reviewCount})" else ""}" }).joinToString(" · ")
            Text(meta, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            l.address?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            l.foundHost?.let { Text("🔗 Found page on $it (not linked from Google)", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            if (l.contact != null || l.bestTime != null) Text("👤 ${listOfNotNull(l.contact?.let { "Ask for: $it" }, l.bestTime).joinToString(" · ")}", style = MaterialTheme.typography.bodySmall)
            if (l.lastActivity != null) {
                // Activity tab: the newest log entry on the card, so the list reads like a log.
                val n = l.lastNote
                if (n == null) Text("📝 No notes yet${if (l.previewOpens > 0) " · 👀 opened preview ${l.previewOpens}×" else ""}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                else {
                    Text("📝 ${n.outcome?.let { OUTCOME_LABEL[it] ?: it.replace('_', ' ') } ?: "Note"} · ${n.author} · ${ago(n.createdAt)}${if (l.notes > 1) " · ${l.notes} entries" else ""}", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 4.dp))
                    if (n.body.isNotBlank()) Text(n.body, style = MaterialTheme.typography.bodySmall, maxLines = 3, overflow = TextOverflow.Ellipsis)
                }
            }
            if (l.followUp != null && (l.salesStatus == "new" || l.salesStatus == "shown")) Text("📅 Call back ${niceDay(l.followUp)}", style = MaterialTheme.typography.bodySmall, color = Warn)
            if (l.unpaidSignup) Text("✍️ Signed, payment not finished", style = MaterialTheme.typography.bodySmall, color = Warn)
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onCall) { Text(if (l.ready) "📞 Call guide" else "📞 Call") }
                if (l.ready) OutlinedButton(onClick = onPreview) { Text("Preview") }
                OutlinedButton(onClick = onOpen) { Text("Details") }
            }
        }
    }
}
