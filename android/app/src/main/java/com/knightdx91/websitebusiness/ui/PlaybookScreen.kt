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
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontStyle
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

/**
 * Plans & answers (owner and callers): what each plan gets them, why it's worth it, ways to pay, extras and what to
 * say when they push back. All the copy comes from `GET /api/content`; prices from `GET /api/plans/options`.
 */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun PlaybookScreen(state: AppState, nav: NavHostController) {
    val context = LocalContext.current
    var content by remember { mutableStateOf<Content?>(null) }
    var options by remember { mutableStateOf<PlanOptions?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var query by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        try {
            content = AppContent.load(state.api)
            options = state.api.planOptions(null)
        } catch (e: Api.Unauthorized) { state.signOut() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { error = e.message ?: "Couldn't load" }
    }

    Scaffold(topBar = {
        TopAppBar(title = { Text("Plans & answers") }, navigationIcon = { IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } })
    }) { pad ->
        val c = content
        val o = options
        if (c == null || o == null) {
            Column(Modifier.fillMaxSize().padding(pad).padding(24.dp)) {
                if (error != null) Text(error ?: "", color = MaterialTheme.colorScheme.error) else CircularProgressIndicator()
            }
            return@Scaffold
        }
        val q = query.trim().lowercase()
        val hits = if (q.isEmpty()) c.playbookObjections else c.playbookObjections.filter { it.question.lowercase().contains(q) || it.answer.lowercase().contains(q) }
        LazyColumn(Modifier.fillMaxSize().padding(pad), contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            item {
                Text("What each plan gets them, why it's worth it, and what to say when they push back.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
                    Button(onClick = { nav.navigate("plans") }) { Text("📋 Show the customer the plans") }
                    OutlinedButton(onClick = { nav.navigate(pdfNav("/api/contract.pdf", "Agreement")) }) { Text("📄 Read the agreement") }
                }
            }
            item {
                SectionCard("Which plan fits?") {
                    Text("Lead with the middle plan. Go down if price is the worry, up if they want it all done for them.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    c.planQuestions.forEach { (question, plan) ->
                        Text("• $question → $plan", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 4.dp))
                    }
                }
            }
            items(o.plans, key = { it.id }) { p -> PlanPitchCard(p, c, o) }
            item {
                SectionCard("Ways to pay") {
                    o.payWays.forEach { w -> Text("• ${w.title}: ${w.detail}", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 4.dp)) }
                    Text(
                        "Send the sign-up link from the call guide. They pick the plan and the way to pay, read the agreement, and pay by a secure link. Never take card numbers over the phone.",
                        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 8.dp),
                    )
                }
            }
            val church = c.churchYearly
            if (church != null) item {
                SectionCard("⛪ Churches & nonprofits") {
                    Bullets(listOf(
                        "Yearly rate: 12 months for the price of ${church.payFor} (${church.free} months free), so it fits one budget line. ${church.plans.joinToString(" · ") { "${it.first} ${it.second}/year" }}.",
                        "Expect a check or an invoice: many pay from the church account, not a card. Say yes to that; the owner sends the invoice.",
                        "Decisions take a meeting: deacons, elders, a board or the post. Leave the flyer for it, ask when it is, and set the callback for the day after.",
                    ))
                }
            }
            if (o.addons.isNotEmpty()) item {
                SectionCard("Extras") {
                    Text("Offer one when it fits. Any extra goes with any plan.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    o.addons.forEach { a ->
                        Column(Modifier.padding(top = 8.dp)) {
                            Text("${a.name} · ${a.price}", fontWeight = FontWeight.SemiBold)
                            if (a.about.isNotBlank()) Text(a.about, style = MaterialTheme.typography.bodySmall)
                            val hint = c.offerHint(a.name)
                            if (hint.isNotBlank()) Text("Offer to: $hint", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
            item {
                SectionCard("If they say…") {
                    OutlinedTextField(query, { query = it }, label = { Text("Find an answer") }, placeholder = { Text("price, contract, Facebook…") }, singleLine = true, modifier = Modifier.fillMaxWidth().padding(top = 6.dp))
                    if (hits.isEmpty()) Text("Nothing matches. Try another word.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 8.dp))
                    hits.forEach { ObjectionRow(it.question, it.answer, forceOpen = q.isNotEmpty()) }
                }
            }
            item { SectionCard("Always") { Bullets(c.playbookAlways) } }
        }
    }
}

@Composable
private fun PlanPitchCard(p: PlanOffer, c: Content, o: PlanOptions) {
    val pitch = c.planPitch[p.id]
    val star = p.id == "plus"
    Card(Modifier.fillMaxWidth(), colors = if (star) CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer) else CardDefaults.cardColors()) {
        Column(Modifier.padding(14.dp)) {
            Text("${p.name}: ${moneyDollars(p.monthly)}/month${if (star) " ⭐ most pick this" else ""}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            val setup = when {
                p.setup > 0 -> "${moneyDollars(p.setup)} setup"
                o.terms.commits.isNotEmpty() -> "No setup fee on the ${o.terms.commitWords} plan"
                else -> "No setup fee"
            }
            Text("$setup · billed monthly", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            if (pitch != null && pitch.fit.isNotBlank()) Row(Modifier.padding(top = 6.dp)) { Text("Good for: ", fontWeight = FontWeight.Bold); Text(pitch.fit) }
            if (p.includes.isNotEmpty()) {
                Text("What they get", fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 8.dp))
                Bullets(p.includes)
            }
            if (pitch != null && pitch.points.isNotEmpty()) {
                Text("Why it's worth it", fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 8.dp))
                Bullets(pitch.points)
            }
            if (pitch != null && pitch.line.isNotBlank()) Text("“${pitch.line}”", style = MaterialTheme.typography.bodyLarge, fontStyle = FontStyle.Italic, modifier = Modifier.padding(top = 8.dp))
            if (p.options.isNotEmpty()) {
                Text("Ways to pay for ${p.name}", fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 8.dp))
                p.options.forEach { b -> Text("• ${b.label}: ${b.detail}. ${money(b.dueTodayCents)} today.", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 2.dp)) }
            }
        }
    }
}
