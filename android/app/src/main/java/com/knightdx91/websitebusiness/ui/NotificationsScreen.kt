package com.knightdx91.websitebusiness.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.knightdx91.websitebusiness.AppState
import com.knightdx91.websitebusiness.net.EventItem
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsScreen(state: AppState, nav: NavHostController) {
    val scope = rememberCoroutineScope()
    var items by remember { mutableStateOf<List<EventItem>>(emptyList()) }
    var error by remember { mutableStateOf<String?>(null) }

    suspend fun load() {
        try {
            val n = state.api.notifications()
            items = n.items
            state.api.notificationsSeen()
            state.unread = 0
            state.api.prefs.lastAlertAt = maxOf(state.api.prefs.lastAlertAt, n.items.maxOfOrNull { it.at } ?: 0L)
        } catch (e: com.knightdx91.websitebusiness.net.Api.Unauthorized) { state.signOut() } catch (e: Exception) { error = e.message }
    }
    LaunchedEffect(Unit) { load() }

    Scaffold(topBar = { TopAppBar(title = { Text("Alerts") }, actions = { IconButton(onClick = { scope.launch { load() } }) { Icon(Icons.Default.Refresh, "Refresh") } }) }) { pad ->
        LazyColumn(Modifier.fillMaxSize().padding(pad), contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            error?.let { item { Text(it, color = MaterialTheme.colorScheme.error) } }
            if (items.isEmpty() && error == null) item { Text("Nothing yet. Calls, notes, sales, sign-ups and preview opens from the team show up here.", color = MaterialTheme.colorScheme.onSurfaceVariant) }
            items(items, key = { it.id }) { e ->
                Card(
                    modifier = Modifier.fillMaxWidth().clickable(enabled = e.leadId != null) { e.leadId?.let { nav.navigate("lead/$it") } },
                    colors = if (e.unread) CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer) else CardDefaults.cardColors(),
                ) {
                    Column(Modifier.padding(12.dp)) {
                        Text(e.text, style = MaterialTheme.typography.bodyLarge, fontWeight = if (e.unread) FontWeight.SemiBold else FontWeight.Normal)
                        Text(listOfNotNull(e.leadName, ago(e.at)).joinToString(" · "), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
}
