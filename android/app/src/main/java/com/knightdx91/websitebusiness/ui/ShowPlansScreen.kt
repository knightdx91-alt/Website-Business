package com.knightdx91.websitebusiness.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.knightdx91.websitebusiness.AppState
import com.knightdx91.websitebusiness.net.Api
import com.knightdx91.websitebusiness.net.AppContent
import com.knightdx91.websitebusiness.net.Content
import com.knightdx91.websitebusiness.net.PlanOffer
import com.knightdx91.websitebusiness.net.PlanOptions
import com.knightdx91.websitebusiness.net.planOptions
import kotlinx.coroutines.launch

/** Show plans is the one screen the customer reads, so it is always light, whatever the phone's theme. */
internal val ShowPlansLight = lightColorScheme(
    primary = Navy,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFDDE3F2),
    onPrimaryContainer = Navy,
    secondary = Orange,
    onSecondary = Navy,
    secondaryContainer = Color(0xFFFFE8C2),
    onSecondaryContainer = Color(0xFF4A2E00),
    background = Color(0xFFF4F5F8),
    surface = Color.White,
    onSurface = Color(0xFF1B1F2A),
    surfaceVariant = Color(0xFFECEEF3),
    onSurfaceVariant = Color(0xFF5B6270),
    outline = Color(0xFFD5D9E1),
)

/**
 * Customer-facing plan cards (owner and callers): hand the phone over. From a lead, "Choose <plan>" makes that
 * lead's sign-up link and opens it right here so they can sign and pay on this phone.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShowPlansScreen(state: AppState, nav: NavHostController, leadId: String?) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var content by remember { mutableStateOf<Content?>(null) }
    var options by remember { mutableStateOf<PlanOptions?>(null) }
    var business by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var choosing by remember { mutableStateOf<String?>(null) }
    val company = state.meta?.companyName?.ifBlank { null } ?: "Underground Associates"

    LaunchedEffect(leadId) {
        try {
            content = AppContent.load(state.api)
            if (leadId != null) business = runCatching { state.api.lead(leadId).lead.name }.getOrDefault("")
            options = state.api.planOptions(leadId)
        } catch (e: Api.Unauthorized) { state.signOut() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { error = e.message ?: "Couldn't load the plans" }
    }

    // "Choose <plan>" opens the native sign-up screen, which makes the lead's sign-up link and lets them sign and pay here.
    fun choose(planId: String) {
        if (leadId == null) return
        nav.navigate("signup/$leadId?plan=$planId")
    }

    MaterialTheme(colorScheme = ShowPlansLight) {
        Scaffold(
            containerColor = ShowPlansLight.background,
            topBar = {
                TopAppBar(
                    title = { Text(company, maxLines = 1) },
                    navigationIcon = { IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
                )
            },
        ) { pad ->
            val c = content
            val o = options
            if (c == null || o == null) {
                Column(Modifier.fillMaxSize().padding(pad).padding(24.dp)) {
                    if (error != null) Text(error ?: "", color = MaterialTheme.colorScheme.error) else CircularProgressIndicator()
                }
                return@Scaffold
            }
            val t = o.terms
            LazyColumn(Modifier.fillMaxSize().padding(pad), contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                item {
                    Text(if (business.isNotBlank()) "Website plans for $business" else "Website plans", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    val lead = if (t.commits.isNotEmpty()) "No setup fee on ${t.commitWords} plans." + (if (t.flex > 0) " Month to month has a one-time ${moneyDollars(t.flex)} setup fee." else "") else "One simple monthly price."
                    Text("$lead We build your site, host it and keep it running.", modifier = Modifier.padding(top = 4.dp))
                }
                items(o.plans, key = { it.id }) { p -> PlanCard(p, c, o, leadId, choosing, onChoose = { choose(p.id) }, onAgreement = { nav.navigate(pdfNav("/api/contract.pdf?" + (if (leadId != null) "lead=$leadId&" else "") + "plan=${p.id}", "Agreement")) }) }
                item { SectionCard("Every plan includes") { Bullets(c.everyPlan) } }
                item {
                    SectionCard("Ways to pay") {
                        o.payWays.forEach { w ->
                            Text(w.title, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 8.dp))
                            Text(w.detail, style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
                if (o.addons.isNotEmpty()) item {
                    SectionCard("Add-ons") {
                        o.addons.forEach { a ->
                            Row(Modifier.fillMaxWidth().padding(top = 8.dp), verticalAlignment = Alignment.Top) {
                                Column(Modifier.weight(1f)) {
                                    Text(a.name, fontWeight = FontWeight.SemiBold)
                                    if (a.about.isNotBlank()) Text(a.about, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Text(a.price, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 10.dp))
                            }
                        }
                    }
                }
                item {
                    Text(
                        "You see your website before you pay anything, and nothing goes live until you say so. Cancel with 30 days' notice" +
                            (if (t.commits.isNotEmpty()) " once your ${t.commitWords} plan's months are up." else "."),
                        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp, bottom = 16.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun PlanCard(p: PlanOffer, c: Content, o: PlanOptions, leadId: String?, choosing: String?, onChoose: () -> Unit, onAgreement: () -> Unit) {
    val star = p.id == "plus"
    Card(
        Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = if (star) Color(0xFFFFF7E6) else MaterialTheme.colorScheme.surface),
    ) {
        Column(Modifier.padding(16.dp)) {
            if (star) Text("Most popular", color = Navy, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, modifier = Modifier.background(Orange, RoundedCornerShape(6.dp)).padding(horizontal = 8.dp, vertical = 3.dp))
            Text(p.name, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = if (star) 6.dp else 0.dp))
            val tag = c.planTagline[p.id] ?: ""
            if (tag.isNotBlank()) Text(tag, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Row(verticalAlignment = Alignment.Bottom, modifier = Modifier.padding(top = 8.dp)) {
                Text(moneyDollars(p.monthly), style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Bold)
                Text("/month", modifier = Modifier.padding(start = 4.dp, bottom = 6.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            val setup = when {
                p.setup > 0 -> "${moneyDollars(p.setup)} setup · "
                o.terms.commits.isNotEmpty() -> "No setup fee on ${o.terms.commitWords} plans · "
                else -> ""
            }
            Text("${setup}about ${moneyDollars(p.perDay)} a day", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Bullets(p.includes, Modifier.padding(top = 6.dp))
            if (p.options.isNotEmpty()) {
                Text(
                    p.options.joinToString(" · ") { "${it.label}: ${money(it.dueTodayCents)} today" },
                    style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 8.dp),
                )
            }
            if (leadId != null) {
                val busy = choosing == p.id
                Button(onClick = onChoose, enabled = choosing == null, modifier = Modifier.fillMaxWidth().padding(top = 10.dp)) { Text(if (busy) "Opening sign-up…" else "Choose ${p.name}") }
            }
            TextButton(onClick = onAgreement, contentPadding = PaddingValues(0.dp)) { Text("Read the agreement") }
        }
    }
}
