package com.knightdx91.websitebusiness.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import com.knightdx91.websitebusiness.net.Api
import com.knightdx91.websitebusiness.net.CustomerPitch
import com.knightdx91.websitebusiness.net.clientLink
import com.knightdx91.websitebusiness.net.showBoard
import kotlinx.coroutines.launch

/**
 * 🐠 Show them the Tank board (owner and callers): the customer-facing page for a shop, always light like Show plans.
 * "Try the board" makes (or reuses) the shop's board link and opens it; the tablet view opens in the browser.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShowBoardScreen(state: AppState, nav: NavHostController, leadId: String) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var pitch by remember { mutableStateOf<CustomerPitch?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var opening by remember { mutableStateOf(false) }
    val company = state.meta?.companyName?.ifBlank { null } ?: "Underground Associates"
    LaunchedEffect(leadId) {
        try {
            pitch = state.api.showBoard(leadId)
        } catch (e: Api.Unauthorized) { state.signOut() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { error = e.message ?: "Couldn't load" }
    }
    MaterialTheme(colorScheme = ShowPlansLight) {
        Scaffold(containerColor = ShowPlansLight.background, topBar = {
            TopAppBar(title = { Text(company, maxLines = 1) }, navigationIcon = { IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } })
        }) { pad ->
            val p = pitch
            if (p == null) {
                Column(Modifier.fillMaxSize().padding(pad).padding(24.dp)) { if (error != null) Text(error ?: "", color = MaterialTheme.colorScheme.error) else CircularProgressIndicator() }
                return@Scaffold
            }
            LazyColumn(Modifier.fillMaxSize().padding(pad), contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                item {
                    Text(p.title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    Text(p.lead, modifier = Modifier.padding(top = 4.dp))
                }
                items(p.sections) { s ->
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(16.dp)) {
                            Text(s.title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                            s.steps.forEachIndexed { i, step -> Text((if (s.numbered) "${i + 1}. " else "✓ ") + step, modifier = Modifier.padding(top = 8.dp)) }
                        }
                    }
                }
                item { SectionCard("What it costs") { p.price.forEach { Text("✓ $it", modifier = Modifier.padding(top = 6.dp)) } } }
                item {
                    SectionCard("See it") {
                        Button(onClick = {
                            opening = true
                            scope.launch {
                                try { val (url, _) = state.api.clientLink(leadId); context.openUrl(url) } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { context.toast(e.message ?: "Couldn't open the board") } finally { opening = false }
                            }
                        }, enabled = !opening, modifier = Modifier.fillMaxWidth().padding(top = 6.dp)) { Text("🐠 Try the board on this phone") }
                        OutlinedButton(onClick = { context.openUrl(p.displayUrl) }, modifier = Modifier.fillMaxWidth().padding(top = 6.dp)) { Text("📺 See the tablet view") }
                        OutlinedButton(onClick = { nav.navigate("plans/$leadId") }, modifier = Modifier.fillMaxWidth().padding(top = 6.dp)) { Text("📋 See the plans") }
                    }
                }
                item { Text(p.fine, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp, bottom = 16.dp)) }
            }
        }
    }
}
