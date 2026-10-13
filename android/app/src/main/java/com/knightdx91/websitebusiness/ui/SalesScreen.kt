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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.knightdx91.websitebusiness.AppState
import com.knightdx91.websitebusiness.net.Api
import com.knightdx91.websitebusiness.net.SalesData
import com.knightdx91.websitebusiness.net.SalesRow
import com.knightdx91.websitebusiness.net.portalUrl
import com.knightdx91.websitebusiness.net.sales
import kotlinx.coroutines.launch

/** The reasons offered when logging "Not interested" (same keys as the web app's LOST_REASONS). */
private val LOST_REASON_LABELS = listOf("price" to "Price", "has_someone" to "Has someone", "no_need" to "No need", "timing" to "Timing", "other" to "Other")

/** Owner only: revenue, commission, who called whom, the pipeline, clients and website orders (`GET /api/sales`). */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun SalesScreen(state: AppState, nav: NavHostController) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val meta = state.meta
    val isOwner = meta?.isOwner == true
    var d by remember { mutableStateOf<SalesData?>(null) }
    var loading by remember { mutableStateOf(true) }
    var portalBusy by remember { mutableStateOf<String?>(null) }

    suspend fun load() {
        if (!isOwner) { loading = false; return }
        loading = true
        try {
            d = state.api.sales()
        } catch (e: Api.Unauthorized) { state.signOut() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { context.toast(e.message ?: "Couldn't load sales") } finally { loading = false }
    }
    LaunchedEffect(isOwner) { load() }

    fun openPortal(leadId: String) {
        portalBusy = leadId
        scope.launch {
            try {
                context.openUrl(state.api.portalUrl(leadId))
            } catch (e: Api.Unauthorized) { state.signOut() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { context.toast(e.message ?: "No Stripe customer on file for this client yet.") } finally { portalBusy = null }
        }
    }

    // The Plus plan from Settings (or the suggested one) prices the pipeline, like the web app.
    val plusPlan = meta?.plans?.firstOrNull { it.id == "plus" }
    val plusName = plusPlan?.name ?: "Plus"
    val plusMonthly = plusPlan?.monthly ?: 89.0

    Scaffold(topBar = {
        TopAppBar(
            title = { Text("Sales") },
            navigationIcon = { IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
            actions = { if (isOwner) IconButton(onClick = { scope.launch { load() } }) { Icon(Icons.Default.Refresh, "Refresh") } },
        )
    }) { pad ->
        LazyColumn(Modifier.fillMaxSize().padding(pad), contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            if (!isOwner) {
                item { Card(Modifier.fillMaxWidth()) { Text("The sales dashboard is for the owner.", Modifier.padding(14.dp), color = MaterialTheme.colorScheme.onSurfaceVariant) } }
                return@LazyColumn
            }
            if (loading) item { LinearProgressIndicator(Modifier.fillMaxWidth()) }
            val data = d ?: return@LazyColumn
            val clients = data.clients

            item {
                SectionCard("Monthly revenue") {
                    Row(verticalAlignment = Alignment.Bottom) {
                        Text(moneyDollars(data.monthlyRevenue), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                        Text(" / month paid", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(bottom = 6.dp))
                    }
                    Text(
                        "${moneyDollars(data.signedRevenue)}/month signed in total · ${clients.size} client${if (clients.size == 1) "" else "s"}. Mark a sign-up as paid on the lead once their payment is set up.",
                        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            item {
                SectionCard("Commission this month") {
                    when {
                        data.commissionOwed.isEmpty() -> Text("No commission earned yet this month.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        else -> data.commissionOwed.forEach { c ->
                            Text("${c.person}: ${moneyDollars(c.amount)} (${c.sales} sale${if (c.sales == 1) "" else "s"}" + (if (c.bonus != null) ": ${moneyDollars(c.bonus)} up front + ${moneyDollars(c.residual ?: 0.0)} from earlier clients)" else ")"), modifier = Modifier.padding(top = 4.dp))
                        }
                    }
                }
            }
            item { SectionCard("This week") { SalesTable(data.week) } }
            item { SectionCard("This month") { SalesTable(data.month) } }
            val shown = data.pipelineShown
            if (shown != null) {
                val worth = data.pipelineMonthlyIfPlus ?: (shown * plusMonthly)
                item {
                    SectionCard("In the pipeline") {
                        Row(verticalAlignment = Alignment.Bottom) {
                            Text(moneyDollars(worth), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                            Text(" / month if they all buy $plusName", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(bottom = 6.dp))
                        }
                        Text("$shown lead${if (shown == 1) "" else "s"} shown × ${moneyDollars(plusMonthly)} ($plusName).", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            if (data.funnel.isNotEmpty()) item {
                SectionCard("From lead to live") {
                    val top = (data.funnel.firstOrNull()?.count ?: 1).coerceAtLeast(1)
                    data.funnel.forEachIndexed { i, st ->
                        Column(Modifier.padding(top = 8.dp)) {
                            Row { Text(st.label, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f)); Text("${st.count}${st.rate?.let { " · ${Math.round(it * 100)}% of the step before" } ?: ""}", style = MaterialTheme.typography.bodySmall) }
                            androidx.compose.material3.LinearProgressIndicator(progress = { (st.count.toFloat() / top).coerceIn(0.02f, 1f) }, modifier = Modifier.fillMaxWidth().padding(top = 4.dp))
                            st.medianDays?.let { md -> Text("Typically ${if (md < 1) "the same day" else "${if (md == Math.floor(md)) md.toLong().toString() else md.toString()} day${if (md == 1.0) "" else "s"}"} after ${data.funnel.getOrNull(i - 1)?.label?.lowercase() ?: ""}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                        }
                    }
                    Text("Every lead that ever reached each step, and the typical (median) time between steps. A big drop between two steps is where to look.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 8.dp))
                }
            }
            val lostTotal = data.lostReasons.values.sum()
            if (lostTotal > 0) {
                item {
                    SectionCard("Why they said no") {
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 6.dp)) {
                            LOST_REASON_LABELS.forEach { (k, label) ->
                                val n = data.lostReasons[k] ?: 0
                                if (n > 0) AssistChip(onClick = {}, label = { Text("$label $n") })
                            }
                        }
                        Text("From the reason picked when logging Not interested.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 8.dp))
                    }
                }
            }
            item {
                SectionCard("Clients") {
                    if (clients.isEmpty()) {
                        Text("No clients yet. They show up here once someone signs up or is marked Sold.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    clients.forEachIndexed { idx, c ->
                        if (idx > 0) HorizontalDivider(Modifier.padding(vertical = 8.dp))
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = if (idx == 0) 6.dp else 0.dp)) {
                            TextButton(onClick = { nav.navigate("lead/${c.id}") }, contentPadding = PaddingValues(0.dp), modifier = Modifier.weight(1f)) {
                                Text(c.name, fontWeight = FontWeight.Bold, modifier = Modifier.fillMaxWidth())
                            }
                            if (c.status == "live") Text("● Live", color = Good, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                            else Text("Sold", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        val planLine = if (c.plan != null) "${c.plan} · ${moneyDollars(c.monthly)}/mo · ${if (c.paid) "paid" else "payment not set up"}" else "No sign-up on file"
                        Text(planLine + (c.seller?.let { " · sold by $it" } ?: ""), style = MaterialTheme.typography.bodySmall, color = if (c.plan != null && !c.paid) Warn else MaterialTheme.colorScheme.onSurfaceVariant)
                        OutlinedButton(onClick = { openPortal(c.id) }, enabled = portalBusy != c.id, modifier = Modifier.padding(top = 4.dp)) { Text("💳 Billing portal") }
                    }
                }
            }
            item {
                SectionCard("🛒 Website orders") {
                    if (data.websiteOrders.isEmpty()) {
                        Text("None yet. People who buy from “Get started” on your website show up here.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    data.websiteOrders.forEachIndexed { idx, o ->
                        if (idx > 0) HorizontalDivider(Modifier.padding(vertical = 8.dp))
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = if (idx == 0) 6.dp else 0.dp)) {
                            Text(o.business ?: "", fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                            if (o.paid) Text("Paid", color = Good, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                            else Text("Not paid", color = Warn, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                        }
                        Text(o.plan + (if (o.extras.isNotEmpty()) " + ${o.extras.joinToString(", ")}" else "") + " · ${money(o.dueCents)} due", style = MaterialTheme.typography.bodySmall)
                        Text(listOfNotNull(o.name, o.phone, o.email, ago(o.createdAt).ifBlank { null }).joinToString(" · "), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            if (!o.phone.isNullOrBlank()) TextButton(onClick = { context.dial(o.phone) }, contentPadding = PaddingValues(horizontal = 4.dp)) { Text("📞 Call") }
                            TextButton(onClick = { nav.navigate(pdfNav("/api/agreements/s/${o.id}.pdf", "Agreement")) }, contentPadding = PaddingValues(horizontal = 4.dp)) { Text("📄 Agreement") }
                        }
                    }
                    if (data.websiteOrders.isNotEmpty()) {
                        Text("People who bought from “Get started” on your website. Find their business with ➕ Add a business to build their site.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 6.dp))
                        TextButton(onClick = { nav.navigate("add") }, contentPadding = PaddingValues(0.dp)) { Text("➕ Add a business") }
                    }
                }
            }
            item {
                Text(
                    "Calls are logged outcomes. Reached means someone answered. A sale counts for whoever sent the sign-up link, or whoever marked it Sold.",
                    style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 4.dp, vertical = 4.dp),
                )
            }
        }
    }
}

/** Who / Calls / Reached / Interested / Sold, one row per person. */
@Composable
private fun SalesTable(rows: List<SalesRow>) {
    if (rows.isEmpty()) {
        Text("No calls logged yet.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        return
    }
    val num = Modifier.width(56.dp)
    Column(Modifier.padding(top = 6.dp)) {
        Row {
            Text("Who", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
            listOf("Calls/visits", "Reached", "Interest", "Sold").forEach { Text(it, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.End, modifier = num) }
        }
        HorizontalDivider(Modifier.padding(vertical = 4.dp))
        rows.forEach { r ->
            Row(Modifier.padding(vertical = 2.dp)) {
                Text(r.person, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                Text("${r.calls}", textAlign = TextAlign.End, modifier = num)
                Text("${r.reached}", textAlign = TextAlign.End, modifier = num)
                Text("${r.interested}", textAlign = TextAlign.End, modifier = num)
                Text("${r.sold}", textAlign = TextAlign.End, fontWeight = FontWeight.Bold, modifier = num)
            }
        }
    }
}
