package com.knightdx91.websitebusiness.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
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
import androidx.navigation.NavHostController
import com.knightdx91.websitebusiness.AppState
import com.knightdx91.websitebusiness.net.RunInfo
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/** Owner only: pick search groups and start a run; watch recent runs. */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun RunScreen(state: AppState, nav: NavHostController) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val meta = state.meta
    var picked by remember { mutableStateOf(setOf(meta?.categories?.firstOrNull()?.id ?: "")) }
    var wider by remember { mutableStateOf(false) }
    var badSites by remember { mutableStateOf(false) }
    var cap by remember { mutableStateOf((meta?.defaultCap ?: 50).toString()) }
    var runs by remember { mutableStateOf<List<RunInfo>>(emptyList()) }
    var busy by remember { mutableStateOf(false) }

    suspend fun loadRuns() { runCatching { runs = state.api.runs() } }
    LaunchedEffect(Unit) {
        while (true) {
            loadRuns()
            delay(if (runs.any { !it.done }) 5000 else 30000)
        }
    }

    val searches = meta?.categories?.filter { it.id in picked }?.sumOf { if (wider) it.widerSearches else it.searches } ?: 0
    val capN = cap.toIntOrNull() ?: 0

    fun start() {
        if (picked.isEmpty()) return context.toast("Pick at least one category")
        if (capN < 1) return context.toast("How many sites at most?")
        busy = true
        scope.launch {
            try {
                state.api.startRun(picked.toList(), capN.coerceIn(1, 500), wider, badSites)
                context.toast("Run started. It keeps going in the cloud.")
                loadRuns()
            } catch (e: Exception) { context.toast(e.message ?: "Couldn't start") } finally { busy = false }
        }
    }

    Scaffold(topBar = { TopAppBar(title = { Text("Find new leads") }, navigationIcon = { IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } }) }) { pad ->
        LazyColumn(Modifier.fillMaxSize().padding(pad), contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        Text("Pick categories, then Run. It keeps going in the cloud even if you lock the phone.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 8.dp)) {
                            meta?.categories?.forEach { c -> FilterChip(selected = c.id in picked, onClick = { picked = if (c.id in picked) picked - c.id else picked + c.id }, label = { Text(c.label) }) }
                        }
                        Row {
                            TextButton(onClick = { picked = meta?.categories?.map { it.id }?.toSet() ?: emptySet() }) { Text("Pick all") }
                            TextButton(onClick = { picked = emptySet() }) { Text("Clear") }
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) { Checkbox(wider, { wider = it }); Text("Also search nearby towns (Hartselle, Arab, Hanceville, Good Hope, Vinemont)") }
                        Row(verticalAlignment = Alignment.CenterVertically) { Checkbox(badSites, { badSites = it }); Text("Also find businesses with outdated or broken websites") }
                        OutlinedTextField(cap, { cap = it.filter { ch -> ch.isDigit() }.take(3) }, label = { Text("Most sites to build this run") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), singleLine = true, modifier = Modifier.fillMaxWidth().padding(top = 6.dp))
                        Text("$searches Google searches · up to $capN sites", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp))
                        Button(onClick = { start() }, enabled = !busy && picked.isNotEmpty(), modifier = Modifier.padding(top = 10.dp)) { Text("Run") }
                    }
                }
            }
            item { Text("Recent runs", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold) }
            if (runs.isEmpty()) item { Text("No runs yet.", color = MaterialTheme.colorScheme.onSurfaceVariant) }
            items(runs, key = { it.id }) { r ->
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(12.dp)) {
                        Text(r.categories.joinToString(", ") { id -> meta?.categories?.firstOrNull { it.id == id }?.label ?: id }, fontWeight = FontWeight.SemiBold)
                        val searching = r.searchesDone < r.searchesTotal
                        val finished = r.ready + r.failed
                        val pct = when {
                            r.stalled || r.done -> 1f
                            searching -> 0.2f * r.searchesDone / maxOf(1, r.searchesTotal)
                            r.total > 0 -> 0.2f + 0.8f * finished / r.total
                            else -> 1f
                        }
                        LinearProgressIndicator(progress = { pct }, modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp))
                        val label = when {
                            r.stalled -> "Stopped early · ${r.ready} site${if (r.ready == 1) "" else "s"} ready. Run it again to pick up the rest."
                            searching -> "Searching Google… (${r.searchesDone}/${r.searchesTotal})"
                            r.done -> "Done · ${r.ready} sites ready${if (r.failed > 0) " · ${r.failed} failed" else ""}"
                            else -> "Building sites… $finished of ${r.total}"
                        }
                        Text("$label · ${ago(r.createdAt)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        if (r.stalled) TextButton(onClick = { scope.launch { runCatching { state.api.dismissRun(r.id) }; loadRuns() } }) { Text("Dismiss") }
                    }
                }
            }
        }
    }
}
