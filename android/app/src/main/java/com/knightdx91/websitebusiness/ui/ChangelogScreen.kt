package com.knightdx91.websitebusiness.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
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
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.knightdx91.websitebusiness.AppState
import com.knightdx91.websitebusiness.net.Api
import com.knightdx91.websitebusiness.net.ChangeEntry
import com.knightdx91.websitebusiness.net.changelog
import com.knightdx91.websitebusiness.net.changelogSeen
import java.time.LocalDate
import java.time.format.DateTimeFormatter

private val DATE_FMT = DateTimeFormatter.ofPattern("MMM d, yyyy")

fun changeDate(d: String): String = runCatching { LocalDate.parse(d).format(DATE_FMT) }.getOrDefault(d)

/** One change-log entry: title, date (+ Android version), and the plain-language list. */
@Composable
fun ChangeEntryView(e: ChangeEntry) {
    Column {
        Text(e.title, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)
        Text(changeDate(e.date) + (e.android?.let { " · Android $it" } ?: ""), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        e.items.forEach { Text("• $it", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 4.dp)) }
    }
}

/** The list inside a dialog (What's new after an update, and the Update available pop-up). */
@Composable
fun ChangeList(entries: List<ChangeEntry>, modifier: Modifier = Modifier) {
    Column(modifier.heightIn(max = 380.dp).verticalScroll(rememberScrollState())) {
        entries.forEachIndexed { i, e ->
            if (i > 0) HorizontalDivider(Modifier.padding(vertical = 10.dp))
            ChangeEntryView(e)
        }
    }
}

/** "What's new" after an update: what changed since this person last looked. Got it marks everything seen. */
@Composable
fun WhatsNewDialog(entries: List<ChangeEntry>, onSeeAll: () -> Unit, onDone: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDone,
        title = { Text("📋 What's new") },
        text = {
            Column {
                Text("What changed in the app since you last looked.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(bottom = 10.dp))
                ChangeList(entries)
            }
        },
        confirmButton = { Button(onClick = onDone) { Text("Got it") } },
        dismissButton = { TextButton(onClick = { onSeeAll(); onDone() }) { Text("See everything") } },
    )
}

/** Settings → 📋 What's new: every update, newest first, searchable. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChangelogScreen(state: AppState, nav: NavHostController) {
    var entries by remember { mutableStateOf<List<ChangeEntry>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var q by remember { mutableStateOf("") }
    LaunchedEffect(Unit) {
        try {
            val c = state.api.changelog()
            entries = c.entries
            if (c.seen == null || c.seen < c.latest) runCatching { state.api.changelogSeen() }
        } catch (e: Api.Unauthorized) { state.signOut() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { error = e.message }
    }
    Scaffold(topBar = {
        TopAppBar(title = { Text("📋 What's new") }, navigationIcon = { IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } })
    }) { pad ->
        val list = entries
        when {
            error != null -> Column(Modifier.padding(pad).padding(16.dp)) { Text(error!!, color = MaterialTheme.colorScheme.error) }
            list == null -> Column(Modifier.fillMaxSize().padding(pad), horizontalAlignment = Alignment.CenterHorizontally) { Spacer(Modifier.height(48.dp)); CircularProgressIndicator() }
            else -> {
                val shown = if (q.isBlank()) list else list.filter { e -> (e.title + " " + e.items.joinToString(" ")).contains(q.trim(), ignoreCase = true) }
                LazyColumn(Modifier.fillMaxSize().padding(pad), contentPadding = PaddingValues(12.dp, 8.dp, 12.dp, 32.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    item {
                        Text("Every update to the app, newest first. After an update, the new ones pop up once.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        OutlinedTextField(q, { q = it }, label = { Text("Search the changes") }, singleLine = true, modifier = Modifier.fillMaxWidth().padding(top = 8.dp))
                    }
                    items(shown, key = { it.n }) { e -> Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(14.dp)) { ChangeEntryView(e) } } }
                }
            }
        }
    }
}
