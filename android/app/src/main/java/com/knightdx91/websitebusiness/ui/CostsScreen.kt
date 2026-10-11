package com.knightdx91.websitebusiness.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.knightdx91.websitebusiness.AppState
import com.knightdx91.websitebusiness.net.CostsReport
import com.knightdx91.websitebusiness.net.ServiceReport
import com.knightdx91.websitebusiness.net.costs
import com.knightdx91.websitebusiness.net.saveCosts
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.util.Locale

private fun cents(c: Double): String = money(Math.round(c))
private fun qty(n: Long): String = String.format(Locale.US, "%,d", n)

/** 💵 Costs & usage (owner and full access): every outside service, this month's usage and estimate, renewals, warnings; Edit saves to /api/costs. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CostsScreen(state: AppState, nav: NavHostController) {
    var report by remember { mutableStateOf<CostsReport?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var editing by remember { mutableStateOf<ServiceReport?>(null) }
    var budgetOpen by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val ctx = LocalContext.current
    LaunchedEffect(Unit) {
        try {
            report = state.api.costs()
        } catch (e: kotlinx.coroutines.CancellationException) {
            throw e
        } catch (e: Exception) {
            error = e.message ?: "Couldn't load"
        }
    }
    fun save(body: JSONObject) {
        scope.launch {
            try {
                report = state.api.saveCosts(body)
                editing = null
                budgetOpen = false
            } catch (e: kotlinx.coroutines.CancellationException) {
                throw e
            } catch (e: Exception) {
                error = e.message ?: "Couldn't save"
            }
        }
    }
    val r = report
    Scaffold(topBar = {
        TopAppBar(title = { Text("💵 Costs & usage") }, navigationIcon = { IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back") } })
    }) { padding ->
        when {
            r == null && error != null -> Text(error ?: "", color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(padding).padding(16.dp))
            r == null -> CircularProgressIndicator(Modifier.padding(padding).padding(24.dp))
            else -> LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(12.dp, 8.dp, 12.dp, 32.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                item {
                    val net = r.revenueCents - r.outCents
                    SectionCard("This month") {
                        Text("Estimates from the app's own counter and the prices typed in here; the invoices are on each service's billing page.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.height(8.dp))
                        Text("Going out: ${money(r.outCents)} so far", fontWeight = FontWeight.Bold)
                        Text("${money(r.fixedCents)} fixed · ${money(r.usageCents)} usage · ${money(r.feesCents)} card fees", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.height(6.dp))
                        Text("Coming in: ${money(r.revenueCents)} a month from paid plans", fontWeight = FontWeight.Bold)
                        if (r.signedRevenueCents > r.revenueCents) Text("${money(r.signedRevenueCents)} once everyone signed has paid", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.height(6.dp))
                        Text("${if (net >= 0) "Ahead" else "Behind"} by ${money(Math.abs(net))} a month · budget ${money(r.budgetCents)}")
                        Row(Modifier.padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(onClick = { budgetOpen = true }) { Text("Change budget") }
                            OutlinedButton(onClick = { nav.navigate("guide/costs") }) { Text("📖 How to read this") }
                        }
                        if (r.warnings.isEmpty()) Text("No warnings this month.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 8.dp))
                        else Column(Modifier.padding(top = 8.dp)) { r.warnings.forEach { Text("⚠️ $it", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(bottom = 4.dp)) } }
                        if (error != null) Text(error ?: "", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                    }
                }
                items(r.services, key = { it.id }) { s ->
                    val kindLabel = when (s.kind) { "fixed" -> "Fixed price"; "usage" -> "Billed by use"; "fees" -> "Fees per payment"; else -> "Free" }
                    val priceLine = buildString {
                        append(kindLabel)
                        if (s.kind == "fixed") append(" · " + (s.monthlyCents?.let { money(it) + " a " + (if (s.renewEvery == "year") "year" else "month") } ?: "price not set"))
                        if (s.kind == "fixed" && s.renews != null) append(" · renews ${s.renews}")
                        if (s.kind != "fixed" && s.perMonthCents > 0) append(" · about ${cents(s.perMonthCents)} this month")
                    }
                    CollapsibleCard("${s.emoji} ${s.name}", summary = priceLine, defaultOpen = s.warnings.isNotEmpty()) {
                        Column(Modifier.fillMaxWidth()) {
                            Text(priceLine, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(s.what, modifier = Modifier.padding(top = 6.dp))
                            if (s.usage.isNotEmpty()) {
                                HorizontalDivider(Modifier.padding(vertical = 8.dp))
                                s.usage.forEach { u ->
                                    val rate = if (u.unit == "per_million") "${cents(u.unitCents)} per million tokens" else if (u.unitCents <= 0.0) "free" else if (u.unitCents >= 100) "${cents(u.unitCents)} each" else String.format(Locale.US, "%s¢ each", u.unitCents.toString().trimEnd('0').trimEnd('.'))
                                    Text(u.label, fontWeight = FontWeight.SemiBold)
                                    Text("This month ${qty(u.month)} · last month ${qty(u.lastMonth)} · $rate" + (if (u.estCents > 0) " · est. ${cents(u.estCents)}" else ""), style = MaterialTheme.typography.bodySmall)
                                    if (u.freeQty in 1..999_999) Text("${qty(u.freeQty)} free a month" + (u.freeUsed?.let { " · ${Math.round(it * 100)}% used" } ?: ""), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    if (u.note != null) Text(u.note, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Spacer(Modifier.height(6.dp))
                                }
                            }
                            s.warnings.forEach { Text("⚠️ $it", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(bottom = 4.dp)) }
                            Text("If it stops: ${s.ifItStops}", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp))
                            if (s.tip != null) Text(s.tip, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp))
                            if (s.account != null) Text("Account: ${s.account}", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp))
                            if (s.notes != null) Text("Notes: ${s.notes}", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp))
                            Row(Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                if (s.url != null) OutlinedButton(onClick = { ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(s.url))) }) { Text(if (s.kind == "free") "Open dashboard" else "Open billing") }
                                OutlinedButton(onClick = { editing = s }) { Text("Edit") }
                            }
                        }
                    }
                }
            }
        }
    }
    val e = editing
    if (e != null) EditServiceDialog(e, onDismiss = { editing = null }, onSave = { save(it) })
    if (budgetOpen && r != null) {
        var v by remember { mutableStateOf((r.budgetCents / 100).toString()) }
        AlertDialog(
            onDismissRequest = { budgetOpen = false },
            title = { Text("Monthly budget") },
            text = { Column { Text("The screen warns above this amount; 0 turns the warning off.", style = MaterialTheme.typography.bodySmall); OutlinedTextField(v, { v = it }, label = { Text("Dollars a month") }, singleLine = true, modifier = Modifier.padding(top = 8.dp)) } },
            confirmButton = { TextButton(onClick = { v.toDoubleOrNull()?.let { d -> save(JSONObject().put("budgetCents", Math.max(0.0, Math.round(d * 100).toDouble()).toLong())) } }) { Text("Save") } },
            dismissButton = { TextButton(onClick = { budgetOpen = false }) { Text("Cancel") } },
        )
    }
}

@Composable
private fun EditServiceDialog(s: ServiceReport, onDismiss: () -> Unit, onSave: (JSONObject) -> Unit) {
    var monthly by remember { mutableStateOf(s.monthlyCents?.let { String.format(Locale.US, "%.2f", it / 100.0) } ?: "") }
    var renews by remember { mutableStateOf(s.renews ?: "") }
    var account by remember { mutableStateOf(s.account ?: "") }
    var notes by remember { mutableStateOf(s.notes ?: "") }
    val rates = remember { s.usage.associate { u -> u.metric to mutableStateOf(if (u.unit == "per_million") String.format(Locale.US, "%.2f", u.unitCents / 100.0) else u.unitCents.toString().trimEnd('0').trimEnd('.')) } }
    val frees = remember { s.usage.associate { u -> u.metric to mutableStateOf(u.freeQty.toString()) } }
    var bad by remember { mutableStateOf<String?>(null) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("${s.emoji} ${s.name}") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState())) {
                if (s.kind == "fixed") {
                    OutlinedTextField(monthly, { monthly = it }, label = { Text("Price (dollars per ${if (s.renewEvery == "year") "year" else "month"})") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(renews, { renews = it }, label = { Text("Next renewal date (YYYY-MM-DD)") }, singleLine = true, modifier = Modifier.fillMaxWidth().padding(top = 6.dp))
                }
                OutlinedTextField(account, { account = it }, label = { Text("Account it's under (login email, who owns it)") }, singleLine = true, modifier = Modifier.fillMaxWidth().padding(top = 6.dp))
                OutlinedTextField(notes, { notes = it }, label = { Text("Notes") }, modifier = Modifier.fillMaxWidth().padding(top = 6.dp), minLines = 2)
                if (s.usage.isNotEmpty()) {
                    Text("Rates (the estimate uses these; check them against the bill once)", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 10.dp, bottom = 4.dp))
                    s.usage.forEach { u ->
                        Row(Modifier.fillMaxWidth().padding(top = 4.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            OutlinedTextField(rates[u.metric]!!.value, { rates[u.metric]!!.value = it }, label = { Text(u.label + if (u.unit == "per_million") " ($/M tokens)" else " (¢ each)") }, singleLine = true, modifier = Modifier.weight(2f))
                            OutlinedTextField(frees[u.metric]!!.value, { frees[u.metric]!!.value = it }, label = { Text("Free/month") }, singleLine = true, modifier = Modifier.weight(1f))
                        }
                    }
                }
                if (bad != null) Text(bad ?: "", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 6.dp))
            }
        },
        confirmButton = {
            TextButton(onClick = {
                val svc = JSONObject().put("account", account.trim().ifEmpty { JSONObject.NULL }).put("notes", notes.trim().ifEmpty { JSONObject.NULL })
                if (s.kind == "fixed") {
                    val m = monthly.trim()
                    if (m.isNotEmpty() && m.toDoubleOrNull() == null) { bad = "The price must be a number"; return@TextButton }
                    svc.put("monthlyCents", if (m.isEmpty()) JSONObject.NULL else Math.round(m.toDouble() * 100))
                    val d = renews.trim()
                    if (d.isNotEmpty() && !Regex("^\\d{4}-\\d{2}-\\d{2}$").matches(d)) { bad = "The date must look like 2026-11-01"; return@TextButton }
                    svc.put("renews", d.ifEmpty { JSONObject.NULL })
                }
                val ratesJson = JSONObject()
                for (u in s.usage) {
                    val rate = rates[u.metric]!!.value.trim().toDoubleOrNull()
                    val free = frees[u.metric]!!.value.trim().toLongOrNull()
                    if (rate == null || free == null) { bad = "Rates and free amounts must be numbers"; return@TextButton }
                    ratesJson.put(u.metric, JSONObject().put("unitCents", if (u.unit == "per_million") Math.round(rate * 100 * 1000) / 1000.0 else rate).put("freeQty", Math.max(0L, free)))
                }
                onSave(JSONObject().put("services", JSONObject().put(s.id, svc)).put("rates", ratesJson))
            }) { Text("Save") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}
