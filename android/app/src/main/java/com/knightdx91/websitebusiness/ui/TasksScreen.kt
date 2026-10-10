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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.knightdx91.websitebusiness.AppState
import com.knightdx91.websitebusiness.net.Task
import kotlinx.coroutines.launch

/** The team's shared to-do list. `leadId` pre-fills a task for one business. */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun TasksScreen(state: AppState, nav: NavHostController, leadId: String?) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var open by remember { mutableStateOf<List<Task>>(emptyList()) }
    var done by remember { mutableStateOf<List<Task>>(emptyList()) }
    var showDone by remember { mutableStateOf(false) }
    var title by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    var due by remember { mutableStateOf<String?>(null) }
    var assignee by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val meta = state.meta

    suspend fun load() {
        try {
            open = state.api.tasks("open")
            if (showDone) done = state.api.tasks("done")
        } catch (e: com.knightdx91.websitebusiness.net.Api.Unauthorized) { state.signOut() } catch (e: Exception) { context.toast(e.message ?: "Couldn't load tasks") }
    }
    LaunchedEffect(showDone) { load() }

    fun add() {
        if (title.isBlank()) return
        busy = true
        scope.launch {
            try {
                state.api.addTask(title.trim(), notes.trim(), due, null, assignee, leadId)
                title = ""; notes = ""; due = null
                load()
                context.toast("Added")
            } catch (e: Exception) { context.toast(e.message ?: "Couldn't add") } finally { busy = false }
        }
    }

    Scaffold(topBar = {
        TopAppBar(
            title = { Text(if (leadId != null) "Task for this business" else "Tasks") },
            navigationIcon = { if (leadId != null) IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
        )
    }) { pad ->
        LazyColumn(Modifier.fillMaxSize().padding(pad), contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        Text("Add a task", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        OutlinedTextField(title, { title = it }, label = { Text("What") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                        OutlinedTextField(notes, { notes = it }, label = { Text("Notes (optional)") }, modifier = Modifier.fillMaxWidth())
                        Text("When:", style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(top = 6.dp))
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            listOf("Today" to 0, "Tomorrow" to 1, "In 3 days" to 3, "Next week" to 7).forEach { (label, d) ->
                                val day = dayFromNow(d)
                                FilterChip(selected = due == day, onClick = { due = if (due == day) null else day }, label = { Text(label) })
                            }
                        }
                        if (meta != null && meta.team.size > 1) {
                            Text("For:", style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(top = 6.dp))
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                FilterChip(selected = assignee == null, onClick = { assignee = null }, label = { Text("Anyone") })
                                meta.team.forEach { t -> FilterChip(selected = assignee == t.id, onClick = { assignee = t.id }, label = { Text(t.name) }) }
                            }
                        }
                        Button(onClick = { add() }, enabled = !busy && title.isNotBlank(), modifier = Modifier.padding(top = 8.dp)) { Text("Add") }
                    }
                }
            }
            if (open.isEmpty()) item { Text("Nothing open. Nice.", color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(8.dp)) }
            items(open, key = { it.id }) { t -> TaskRow(t, false, onToggle = { scope.launch { runCatching { state.api.setTaskDone(t.id, true) }; load() } }, onLead = { t.leadId?.let { nav.navigate("lead/$it") } }) }
            item { TextButton(onClick = { showDone = !showDone }) { Text(if (showDone) "Hide finished" else "Show finished") } }
            if (showDone) items(done, key = { "d" + it.id }) { t -> TaskRow(t, true, onToggle = { scope.launch { runCatching { state.api.setTaskDone(t.id, false) }; load() } }, onLead = { t.leadId?.let { nav.navigate("lead/$it") } }) }
        }
    }
}

@Composable
private fun TaskRow(t: Task, isDone: Boolean, onToggle: () -> Unit, onLead: () -> Unit) {
    Card(Modifier.fillMaxWidth()) {
        Row(Modifier.padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
            Checkbox(checked = isDone, onCheckedChange = { onToggle() })
            Column(Modifier.weight(1f)) {
                Text(t.title, fontWeight = FontWeight.SemiBold)
                val bits = listOfNotNull(t.due?.let { "📅 ${niceDay(it)}${t.dueTime?.let { tm -> " $tm" } ?: ""}" }, t.assigneeName?.let { "for $it" }, t.createdByName?.let { "by $it" })
                if (bits.isNotEmpty()) Text(bits.joinToString(" · "), style = MaterialTheme.typography.bodySmall, color = if ((t.due ?: "9") < dayFromNow(0) && !isDone) Warn else MaterialTheme.colorScheme.onSurfaceVariant)
                if (t.notes.isNotBlank()) Text(t.notes, style = MaterialTheme.typography.bodySmall)
                if (t.leadName != null) TextButton(onClick = onLead, contentPadding = PaddingValues(0.dp)) { Text("🏢 ${t.leadName}") }
            }
        }
    }
}
