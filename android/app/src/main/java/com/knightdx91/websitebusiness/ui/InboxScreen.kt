package com.knightdx91.websitebusiness.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.knightdx91.websitebusiness.AppState
import com.knightdx91.websitebusiness.net.Api
import com.knightdx91.websitebusiness.net.InboxItem
import com.knightdx91.websitebusiness.net.inbox
import com.knightdx91.websitebusiness.net.inboxMarkRead
import kotlinx.coroutines.launch

/** Owner only: requests customers send through the clients' live websites, the company website and extras requests. */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun InboxScreen(state: AppState, nav: NavHostController) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val isOwner = state.meta?.isOwner == true
    var items by remember { mutableStateOf<List<InboxItem>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var loaded by remember { mutableStateOf(false) }

    suspend fun load() {
        if (!isOwner) { loading = false; return }
        loading = true
        try {
            items = state.api.inbox()
            loaded = true
        } catch (e: Api.Unauthorized) { state.signOut() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { context.toast(e.message ?: "Couldn't load the inbox") } finally { loading = false }
    }
    LaunchedEffect(isOwner) { load() }

    fun markRead(item: InboxItem) {
        scope.launch {
            try {
                state.api.inboxMarkRead(item.id)
                load()
            } catch (e: Api.Unauthorized) { state.signOut() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { context.toast(e.message ?: "Couldn't mark it read") }
        }
    }

    Scaffold(topBar = {
        TopAppBar(
            title = { Text("Inbox") },
            navigationIcon = { IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
            actions = { if (isOwner) IconButton(onClick = { scope.launch { load() } }) { Icon(Icons.Default.Refresh, "Refresh") } },
        )
    }) { pad ->
        LazyColumn(Modifier.fillMaxSize().padding(pad), contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            if (!isOwner) {
                item { Card(Modifier.fillMaxWidth()) { Text("The inbox is for the owner. Requests from client websites go to them.", Modifier.padding(14.dp), color = MaterialTheme.colorScheme.onSurfaceVariant) } }
                return@LazyColumn
            }
            item { Text("Requests customers send through your clients' live websites.", color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 4.dp)) }
            if (loading) item { LinearProgressIndicator(Modifier.fillMaxWidth()) }
            if (loaded && items.isEmpty()) {
                item { Card(Modifier.fillMaxWidth()) { Text("No requests yet. They show up here once a client site is live.", Modifier.padding(14.dp), color = MaterialTheme.colorScheme.onSurfaceVariant) } }
            }
            items(items, key = { it.id }) { i ->
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(i.name.ifBlank { "Someone" }, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                            if (!i.read) Text("New", style = MaterialTheme.typography.labelMedium, color = Warn, fontWeight = FontWeight.Bold)
                        }
                        Text("For ${i.business ?: "a client"} · ${ago(i.createdAt)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        val line = i.requestLine
                        if (line.isNotBlank()) Text(line, modifier = Modifier.padding(top = 6.dp))
                        i.message?.let { Text(it, modifier = Modifier.padding(top = 6.dp)) }
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 8.dp)) {
                            Button(onClick = { context.dial(i.phone) }) { Text("📞 ${i.phone ?: "Call"}") }
                            i.email?.let { email -> OutlinedButton(onClick = { context.openUrl("mailto:$email") }) { Text("Email") } }
                            i.clientLeadId?.let { leadId -> OutlinedButton(onClick = { nav.navigate("lead/$leadId") }) { Text("Open client") } }
                            if (!i.read) OutlinedButton(onClick = { markRead(i) }) { Text("Mark read") }
                        }
                    }
                }
            }
            item { Spacer(Modifier.width(1.dp)) }
        }
    }
}
