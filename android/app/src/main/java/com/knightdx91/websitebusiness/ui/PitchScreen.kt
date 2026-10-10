package com.knightdx91.websitebusiness.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import com.knightdx91.websitebusiness.net.LeadDetail
import com.knightdx91.websitebusiness.net.Pitch
import kotlinx.coroutines.launch

/** The Claude-written call guide for one lead, with Call and the share buttons at the top. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PitchScreen(state: AppState, nav: NavHostController, id: String) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var lead by remember { mutableStateOf<LeadDetail?>(null) }
    var pitch by remember { mutableStateOf<Pitch?>(null) }
    var status by remember { mutableStateOf("Loading…") }

    LaunchedEffect(id) {
        try {
            lead = state.api.lead(id)
            val cached = if (lead?.lead?.hasPitch == true) state.api.pitch(id, false) else null
            if (cached != null) pitch = cached
            else {
                status = "Writing the call guide for this business (about 20 seconds)…"
                pitch = state.api.pitch(id, true)
            }
            status = ""
        } catch (e: Exception) {
            status = e.message ?: "Couldn't load the call guide"
        }
    }

    Scaffold(topBar = {
        TopAppBar(title = { Text(lead?.lead?.name ?: "Call guide", maxLines = 1) }, navigationIcon = { IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } })
    }) { pad ->
        val p = pitch
        val l = lead?.lead
        LazyColumn(Modifier.fillMaxSize().padding(pad), contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            if (l != null) item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = { context.dial(l.phone) }) { Text("📞 Call ${l.phone ?: ""}") }
                    OutlinedButton(onClick = { nav.navigate("lead/${l.id}") }) { Text("Log the call") }
                }
                if (l.contact != null || l.bestTime != null) Text("👤 ${listOfNotNull(l.contact?.let { "Ask for: $it" }, l.bestTime).joinToString(" · ")}", modifier = Modifier.padding(top = 6.dp))
            }
            if (p == null) item {
                Row(Modifier.fillMaxWidth().padding(24.dp), horizontalArrangement = Arrangement.Center) { if (status.isNotEmpty() && !status.startsWith("Writing") && status != "Loading…") Text(status, color = MaterialTheme.colorScheme.error) else Column { CircularProgressIndicator(); Text(status, modifier = Modifier.padding(top = 8.dp)) } }
            } else {
                item { Section("Opener", listOf(p.opener)) }
                item { Section("Why it matters to them", p.whyItMatters) }
                item { Section("What we built", p.whatWeBuilt) }
                item { Section("Questions to ask", p.questionsToAsk) }
                item {
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(14.dp)) {
                            Text("If they say…", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                            p.objections.forEach { (o, r) ->
                                Text("“$o”", fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 8.dp))
                                Text(r, style = MaterialTheme.typography.bodyMedium)
                            }
                        }
                    }
                }
                item { Section("Asking for the yes", listOf(p.close)) }
                item { Section("Don't say", p.avoid) }
            }
        }
    }
}

@Composable
private fun Section(title: String, lines: List<String>) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(14.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            lines.forEach { Text(if (lines.size > 1) "• $it" else it, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.padding(top = 6.dp)) }
        }
    }
}
