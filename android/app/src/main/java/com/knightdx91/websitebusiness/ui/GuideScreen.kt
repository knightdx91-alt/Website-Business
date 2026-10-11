package com.knightdx91.websitebusiness.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.knightdx91.websitebusiness.AppState
import com.knightdx91.websitebusiness.net.Guide
import com.knightdx91.websitebusiness.net.guide

/** 📖 A how-to guide from `GET /api/guides/<id>` (Settings → Guides), one collapsible card per section. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GuideScreen(state: AppState, nav: NavHostController, id: String) {
    var guide by remember { mutableStateOf<Guide?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(id) {
        try {
            guide = state.api.guide(id)
        } catch (e: kotlinx.coroutines.CancellationException) {
            throw e
        } catch (e: Exception) {
            error = e.message ?: "Couldn't load the guide"
        }
    }
    val g = guide
    Scaffold(topBar = {
        TopAppBar(title = { Text(g?.title ?: "Guide", maxLines = 1) }, navigationIcon = { IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back") } })
    }) { padding ->
        when {
            g == null && error != null -> Text(error ?: "", color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(padding).padding(16.dp))
            g == null -> CircularProgressIndicator(Modifier.padding(padding).padding(24.dp))
            else -> LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(12.dp)) {
                item { Text(g.intro, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(bottom = 12.dp)) }
                items(g.sections) { s ->
                    CollapsibleCard(s.title, defaultOpen = s === g.sections.first()) {
                        Column(Modifier.fillMaxWidth()) {
                            s.steps.forEachIndexed { i, step ->
                                Text((if (s.numbered) "${i + 1}. " else "• ") + step, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(bottom = 6.dp))
                            }
                            s.note?.let { Text("Good to know: $it", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Medium, modifier = Modifier.padding(top = 4.dp)) }
                        }
                    }
                }
            }
        }
    }
}
