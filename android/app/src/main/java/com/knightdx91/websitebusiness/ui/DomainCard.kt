package com.knightdx91.websitebusiness.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.knightdx91.websitebusiness.AppState
import com.knightdx91.websitebusiness.net.DomainIdea
import com.knightdx91.websitebusiness.net.DomainInfo
import com.knightdx91.websitebusiness.net.addDomain
import com.knightdx91.websitebusiness.net.checkDomain
import com.knightdx91.websitebusiness.net.domain
import com.knightdx91.websitebusiness.net.domainIdeas
import com.knightdx91.websitebusiness.net.removeDomain
import kotlinx.coroutines.launch

/**
 * 🌐 Their domain (sold + live leads; src/worker/domains.ts): every domain is bought on our Cloudflare in the client's name.
 * Pick a name (free / taken from a public lookup) → "Copy name & open Cloudflare" to buy it → "I bought it" → the app connects
 * it and switches the site over once it works (it also checks every 5 minutes by itself). Mirrors the web's bindDomain.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun DomainCard(state: AppState, id: String, name: String, live: Boolean) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var info by remember { mutableStateOf<DomainInfo?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var ideas by remember { mutableStateOf<List<DomainIdea>?>(null) }
    var query by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var confirmRemove by remember { mutableStateOf(false) }
    val muted = MaterialTheme.colorScheme.onSurfaceVariant

    fun run(block: suspend () -> Unit) {
        if (busy) return
        busy = true
        scope.launch {
            try { block() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { context.toast(e.message ?: "Something went wrong") } finally { busy = false }
        }
    }
    fun loadIdeas(q: String?) = run { ideas = null; ideas = state.api.domainIdeas(id, q) }

    LaunchedEffect(id) {
        try { info = state.api.domain(id); error = null } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { error = e.message ?: "Couldn't check the domain" }
    }
    LaunchedEffect(info?.stage) { if (info?.stage == "none" && ideas == null) runCatching { ideas = state.api.domainIdeas(id) } }

    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(14.dp)) {
            Text("🌐 Their domain", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            val d = info
            when {
                d == null -> Text(error ?: "Checking…", style = MaterialTheme.typography.bodySmall, color = muted)
                d.stage == "none" -> {
                    Text("Every domain is bought on our Cloudflare, in the client's name, so the app can hook it up by itself. Pick one:", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp))
                    val list = ideas
                    if (list == null) Text("Checking which names are free…", style = MaterialTheme.typography.bodySmall, color = muted, modifier = Modifier.padding(top = 6.dp))
                    else if (list.isEmpty()) Text("No ideas from that. Type a full name like theirbusiness.com.", style = MaterialTheme.typography.bodySmall, color = muted)
                    else list.forEach { idea ->
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().padding(top = 6.dp)) {
                            Text(idea.domain, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                            Text(when (idea.available) { true -> "Free"; false -> "Taken"; null -> "Couldn't check" }, color = when (idea.available) { true -> Good; false -> muted; null -> Warn }, style = MaterialTheme.typography.labelLarge)
                            if (idea.available != false) {
                                Spacer(Modifier.width(8.dp))
                                OutlinedButton(onClick = { run { info = state.api.addDomain(id, idea.domain) } }, enabled = !busy) { Text("Use this") }
                            }
                        }
                    }
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 8.dp)) {
                        OutlinedTextField(query, { query = it.trim() }, placeholder = { Text("Try another name") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri), modifier = Modifier.weight(1f))
                        Spacer(Modifier.width(8.dp))
                        Button(onClick = { loadIdeas(query) }, enabled = !busy && query.isNotBlank()) { Text("Check") }
                    }
                    Text("The free .pages.dev address works the whole time. A domain is the \"Domain name, bought for you\" extra on their order (\$2 a month, included with Pro).", style = MaterialTheme.typography.bodySmall, color = muted, modifier = Modifier.padding(top = 6.dp))
                }
                d.stage == "buy" -> {
                    Status(d.domain ?: "", "Not bought yet", Warn)
                    Text("1. Tap Copy name & open Cloudflare and register ${d.domain} there (paste the name). Put the client as the registrant contact: the domain is theirs. Leave auto-renew on.", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp))
                    Text("2. Come back and tap I bought it. The app connects it to $name's site${if (live) "" else " when it's published"} and switches the site over once it works (it also checks every 5 minutes on its own).", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 2.dp))
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 6.dp)) {
                        Button(onClick = { context.copyText("Domain", d.domain ?: ""); context.toast("${d.domain} copied. Paste it in Cloudflare's search."); d.buyUrl?.let { context.openUrl(it) } }) { Text("Copy name & open Cloudflare") }
                        OutlinedButton(onClick = { run { info = state.api.checkDomain(id) } }, enabled = !busy) { Text(if (busy) "Checking…" else "I bought it") }
                        TextButton(onClick = { confirmRemove = true }) { Text("Change / remove") }
                    }
                }
                d.stage == "publish" -> {
                    Status(d.domain ?: "", "Bought", Good)
                    Text("It's in our Cloudflare. Publishing the site hooks it up by itself; until then nothing to do.", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp))
                    TextButton(onClick = { confirmRemove = true }) { Text("Change / remove") }
                }
                d.stage == "connecting" || d.stage == "dns" -> {
                    Status(d.domain ?: "", "Connecting", Warn)
                    Text("Cloudflare is setting it up (usually a few minutes, sometimes an hour). The site keeps its .pages.dev address until it works, then switches by itself and you get an alert." + (d.error?.let { " Last check: $it" } ?: ""), style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp))
                    if (d.records == "no-permission") Text("The app couldn't add the domain's records. Owner: Cloudflare → My Profile → API Tokens → edit the app's token → add Zone · DNS · Edit and Zone · Zone · Read for All zones, then tap Check now.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 4.dp))
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 6.dp)) {
                        OutlinedButton(onClick = { run { info = state.api.checkDomain(id) } }, enabled = !busy) { Text(if (busy) "Checking…" else "Check now") }
                        TextButton(onClick = { confirmRemove = true }) { Text("Change / remove") }
                    }
                }
                else -> {
                    Status(d.domain ?: "", "● Working", Good)
                    Text("The site's address is ${d.domain} (www.${d.domain} goes there too). The .pages.dev address still works.", style = MaterialTheme.typography.bodySmall, color = muted, modifier = Modifier.padding(top = 4.dp))
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 6.dp)) {
                        OutlinedButton(onClick = { context.openUrl("https://${d.domain}") }) { Text("Open it") }
                        TextButton(onClick = { confirmRemove = true }) { Text("Change / remove") }
                    }
                }
            }
        }
    }
    if (confirmRemove) AlertDialog(
        onDismissRequest = { confirmRemove = false },
        title = { Text("Take the domain off?") },
        text = { Text("${info?.domain} stays in Cloudflare; this only disconnects it from the site, which goes back to its .pages.dev address.") },
        confirmButton = { TextButton(onClick = { confirmRemove = false; run { state.api.removeDomain(id); info = DomainInfo(null, null, null, null); ideas = null; ideas = state.api.domainIdeas(id) } }, colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error)) { Text("Take it off") } },
        dismissButton = { TextButton(onClick = { confirmRemove = false }) { Text("Cancel") } },
    )
}

@Composable
private fun Status(domain: String, label: String, color: androidx.compose.ui.graphics.Color) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 4.dp)) {
        Text(domain, fontWeight = FontWeight.Bold)
        Spacer(Modifier.width(8.dp))
        Text(label, color = color, style = MaterialTheme.typography.labelLarge)
    }
}
