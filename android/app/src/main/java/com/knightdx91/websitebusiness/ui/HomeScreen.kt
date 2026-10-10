package com.knightdx91.websitebusiness.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.navigation.NavHostController
import com.knightdx91.websitebusiness.AppState
import com.knightdx91.websitebusiness.net.Lead
import com.knightdx91.websitebusiness.webRoute
import kotlinx.coroutines.launch

private val TABS = listOf("new" to "New", "shown" to "Shown", "callbacks" to "Callbacks", "sold" to "Sold", "live" to "Live")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(state: AppState, nav: NavHostController) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var tab by rememberSaveable { mutableStateOf("new") }
    var category by rememberSaveable { mutableStateOf("") }
    var search by rememberSaveable { mutableStateOf("") }
    var leads by remember { mutableStateOf<List<Lead>>(emptyList()) }
    var due by remember { mutableStateOf<List<Lead>>(emptyList()) }
    var opened by remember { mutableStateOf<List<Lead>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    val meta = state.meta

    suspend fun load() {
        loading = true
        error = null
        try {
            leads = if (tab == "callbacks") state.api.leads(callbacks = "all", category = category.ifBlank { null }) else state.api.leads(sales = tab, category = category.ifBlank { null })
            due = state.api.leads(callbacks = "due")
            opened = state.api.leads(opened = "recent")
            state.unread = runCatching { state.api.unreadCount() }.getOrDefault(state.unread)
        } catch (e: com.knightdx91.websitebusiness.net.Api.Unauthorized) {
            state.signOut()
        } catch (e: Exception) {
            error = e.message
        }
        loading = false
    }

    LaunchedEffect(tab, category) { load() }
    LifecycleResumeEffect(Unit) { scope.launch { load() }; onPauseOrDispose {} }

    val shown = remember(leads, search) {
        val q = search.trim().lowercase()
        if (q.isEmpty()) leads else leads.filter { it.name.lowercase().contains(q) || (it.address ?: "").lowercase().contains(q) || phoneDigits(it.phone).contains(q) }
    }
    val today = remember(due, opened) {
        val seen = HashSet<String>()
        val rows = ArrayList<Pair<Lead, String>>()
        due.forEach { if (seen.add(it.id)) rows.add(it to (if ((it.followUp ?: "") < dayFromNow(0)) "Overdue" else "Callback")) }
        opened.filter { it.salesStatus == "new" || it.salesStatus == "shown" }.forEach { if (seen.add(it.id)) rows.add(it to "Opened preview${if (it.previewOpens > 1) " ${it.previewOpens}×" else ""}") }
        rows.take(12)
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
        LazyColumn(modifier = Modifier.fillMaxSize().padding(pad), contentPadding = PaddingValues(12.dp, 8.dp, 12.dp, 96.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = { nav.navigate(webRoute("/#/add")) }) { Icon(Icons.Default.Add, null); Spacer(Modifier.width(4.dp)); Text("Add a business") }
                    OutlinedButton(onClick = { nav.navigate(webRoute("/#/route")) }) { Text("🗺️ Walk-in route") }
                }
            }
            if (today.isNotEmpty()) item {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        Text("📋 Today: ${today.size} call${if (today.size == 1) "" else "s"}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        today.forEach { (l, why) ->
                            Row(Modifier.fillMaxWidth().padding(top = 8.dp).clickable { nav.navigate("lead/${l.id}") }, verticalAlignment = Alignment.CenterVertically) {
                                Column(Modifier.weight(1f)) {
                                    Text(l.name, fontWeight = FontWeight.SemiBold)
                                    if (l.contact != null) Text("Ask for: ${l.contact}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                AssistChip(onClick = { nav.navigate("lead/${l.id}") }, label = { Text(why) })
                                Spacer(Modifier.width(6.dp))
                                Button(onClick = { if (l.ready) nav.navigate("pitch/${l.id}") else context.dial(l.phone) }) { Text("📞") }
                            }
                        }
                    }
                }
            }
            item {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(TABS) { (id, label) -> FilterChip(selected = tab == id, onClick = { tab = id }, label = { Text(label) }) }
                }
            }
            item {
                OutlinedTextField(search, { search = it }, placeholder = { Text("Search name, street or phone") }, singleLine = true, modifier = Modifier.fillMaxWidth(), leadingIcon = { Icon(Icons.Default.Search, null) })
            }
            if (meta != null) item {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    item { FilterChip(selected = category.isEmpty(), onClick = { category = "" }, label = { Text("All types") }) }
                    val groups = meta.categories.map { it.category }.distinct()
                    items(groups) { c -> FilterChip(selected = category == c, onClick = { category = if (category == c) "" else c }, label = { Text(categoryLabel(c)) }) }
                }
            }
            if (loading && leads.isEmpty()) item { Row(Modifier.fillMaxWidth().padding(24.dp), horizontalArrangement = Arrangement.Center) { CircularProgressIndicator() } }
            error?.let { e -> item { Card { Column(Modifier.padding(14.dp)) { Text(e, color = MaterialTheme.colorScheme.error); Button(onClick = { scope.launch { load() } }, modifier = Modifier.padding(top = 8.dp)) { Text("Try again") } } } } }
            if (!loading && shown.isEmpty() && error == null) item {
                Text(
                    when (tab) {
                        "new" -> if (meta?.isOwner == true) "No new leads. Tap Find new leads to run a search." else "No new leads right now. Check back after the next run."
                        "callbacks" -> "No callbacks scheduled. Log a call and pick “Call back” to schedule one."
                        else -> "Nothing here yet."
                    },
                    color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(12.dp),
                )
            }
            items(shown, key = { it.id }) { l -> LeadCard(l, onOpen = { nav.navigate("lead/${l.id}") }, onCall = { if (l.ready) nav.navigate("pitch/${l.id}") else context.dial(l.phone) }, onPreview = { nav.navigate(webRoute("/#/preview/${l.id}")) }) }
        }
    }
}

@Composable
fun StatusChip(l: Lead) {
    val (text, color) = when {
        l.salesStatus == "live" -> "● Live" to Good
        l.salesStatus == "not_interested" -> "Not interested" to MaterialTheme.colorScheme.onSurfaceVariant
        l.status == "queued" -> "Waiting" to MaterialTheme.colorScheme.onSurfaceVariant
        l.status == "building" -> "Building…" to MaterialTheme.colorScheme.onSurfaceVariant
        l.status == "failed" -> "Build failed" to MaterialTheme.colorScheme.error
        else -> "Site ready" to Good
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
            if (l.contact != null || l.bestTime != null) Text("👤 ${listOfNotNull(l.contact?.let { "Ask for: $it" }, l.bestTime).joinToString(" · ")}", style = MaterialTheme.typography.bodySmall)
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
