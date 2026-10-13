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
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.knightdx91.websitebusiness.AppState
import com.knightdx91.websitebusiness.net.Api
import com.knightdx91.websitebusiness.net.CommissionQuote
import com.knightdx91.websitebusiness.net.CommissionSetup
import com.knightdx91.websitebusiness.net.commissionQuote
import com.knightdx91.websitebusiness.net.commissionSetup
import kotlinx.coroutines.delay

private fun cm(c: Long): String = if (c < 0) "no end" else String.format(java.util.Locale.US, "$%.2f", c / 100.0)

/** "What I'd earn": the same calculator as the web app's #/commission (server-priced, rules from Settings → Commission). */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun CommissionScreen(state: AppState, nav: NavHostController) {
    val context = LocalContext.current
    val isOwner = state.meta?.isOwner == true
    var setup by remember { mutableStateOf<CommissionSetup?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var plan by remember { mutableStateOf("") }
    var billing by remember { mutableStateOf("") }
    val picks = remember { mutableStateMapOf<Int, Int>() }
    var founder by remember { mutableStateOf<Int?>(null) }
    var church by remember { mutableStateOf(false) }
    var quoteText by remember { mutableStateOf("") }
    var who by remember { mutableStateOf("solo") }
    var owner by remember { mutableStateOf("none") }
    var quote by remember { mutableStateOf<CommissionQuote?>(null) }

    LaunchedEffect(Unit) {
        try {
            val s = state.api.commissionSetup()
            setup = s
            s.plans.firstOrNull()?.let { p -> plan = p.id; billing = (p.options.firstOrNull { it.id == "standard" } ?: p.options.firstOrNull())?.id ?: "standard" }
        } catch (e: Api.Unauthorized) { state.signOut() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { error = e.message ?: "Couldn't load the calculator" }
    }
    val s = setup
    val hasQuoteExtra = s != null && picks.keys.any { i -> s.addons.firstOrNull { it.index == i }?.unit == "quote" }
    LaunchedEffect(plan, billing, picks.toMap(), founder, church, quoteText, who, owner, s) {
        if (s == null || plan.isEmpty()) return@LaunchedEffect
        delay(150)
        try {
            quote = state.api.commissionQuote(plan, billing, picks.toMap(), founder, church && billing == "annual", if (hasQuoteExtra) quoteText.toDoubleOrNull() else null, who, owner)
            error = null
        } catch (e: Api.Unauthorized) { state.signOut() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { error = e.message ?: "Couldn't work it out" }
    }

    Scaffold(topBar = {
        TopAppBar(title = { Text("💰 What I'd earn") }, navigationIcon = { IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } })
    }) { pad ->
        LazyColumn(Modifier.fillMaxSize().padding(pad), contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            if (s == null) {
                item { if (error != null) Text(error!!, color = MaterialTheme.colorScheme.error) else LinearProgressIndicator(Modifier.fillMaxWidth()) }
                return@LazyColumn
            }
            val R = s.rules
            item {
                SectionCard("Pick what they're buying") {
                    Text("It shows what each person gets, using the same prices the client is charged.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("Plan", fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 8.dp))
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        s.plans.forEach { p ->
                            FilterChip(selected = plan == p.id, onClick = {
                                plan = p.id
                                if (p.options.none { it.id == billing }) billing = (p.options.firstOrNull { it.id == "standard" } ?: p.options.first()).id
                            }, label = { Text("${p.name} · ${moneyDollars(p.monthly)}") })
                        }
                    }
                    Text("Way to pay", fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 8.dp))
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        s.plans.firstOrNull { it.id == plan }?.options?.forEach { o -> FilterChip(selected = billing == o.id, onClick = { billing = o.id }, label = { Text(o.label) }) }
                    }
                    if (billing == "annual" && s.churchYearly) Row(verticalAlignment = Alignment.CenterVertically) { Checkbox(church, { church = it }); Text("Church or nonprofit (ministry yearly rate)") }
                    Text("Extras", fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 8.dp))
                    s.addons.forEach { a ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(picks.containsKey(a.index), { on -> if (on) picks[a.index] = 1 else picks.remove(a.index) })
                            Column(Modifier.weight(1f)) {
                                Text(a.name)
                                Text(a.priceText, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            if (a.unit == "each" && picks.containsKey(a.index)) {
                                val n = picks[a.index] ?: 1
                                OutlinedButton(onClick = { picks[a.index] = (n - 1).coerceAtLeast(1) }) { Text("−") }
                                Text("$n", modifier = Modifier.padding(horizontal = 8.dp))
                                OutlinedButton(onClick = { picks[a.index] = (n + 1).coerceAtMost(20) }) { Text("+") }
                            }
                        }
                    }
                    if (hasQuoteExtra) OutlinedTextField(quoteText, { quoteText = it.filter { c -> c.isDigit() || c == '.' } }, label = { Text("What we're charging for the priced-per-job extras ($)") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), modifier = Modifier.fillMaxWidth())
                    val founders = s.addons.filter { it.founderPick && it.unit != "month" && it.unit != "quote" }
                    if (founders.isNotEmpty()) {
                        Text("Founding customer's free extra", fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 8.dp))
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            FilterChip(selected = founder == null, onClick = { founder = null }, label = { Text("None") })
                            founders.forEach { a -> FilterChip(selected = founder == a.index, onClick = { founder = a.index }, label = { Text(a.name) }) }
                        }
                    }
                    Text("Who made the sale", fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 8.dp))
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        FilterChip(selected = who == "solo", onClick = { who = "solo"; if (owner == "opener" || owner == "closer") owner = "none" }, label = { Text("One person did it all") })
                        FilterChip(selected = who == "split", onClick = { who = "split"; if (owner == "seller") owner = "none" }, label = { Text("Opened by one, closed by another") })
                    }
                    Text("The owner in this sale", fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 8.dp))
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        val opts = if (who == "split") listOf("none" to "Not part of it", "opener" to "Opened it", "closer" to "Closed it") else listOf("none" to "Not part of it", "seller" to "Made the sale")
                        opts.forEach { (id, label) -> FilterChip(selected = owner == id, onClick = { owner = id }, label = { Text(label) }) }
                    }
                }
            }
            error?.let { e -> item { Text(e, color = MaterialTheme.colorScheme.error) } }
            quote?.let { q ->
                item {
                    Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors()) {
                        Column(Modifier.padding(14.dp)) {
                            Text("What this sale pays", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                            Text("${q.plan} · ${q.billingLabel}. The client pays ${cm(q.clientFirst)} first" + (if (q.clientEach > 0) ", then ${cm(q.clientEach)} ${if (q.interval == "year") "a year" else "a month"}." else "."), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            val per = if (q.interval == "year") "each yearly renewal" else "each month after"
                            q.payouts.forEach { p ->
                                HorizontalDivider(Modifier.padding(vertical = 8.dp))
                                val label = (if (p.role == "Seller") "The seller" else "The ${p.role.lowercase()}") + if (p.owner) " (the owner)" else ""
                                Text(label + if (p.keptByCompany) " · stays in the company" else "", fontWeight = FontWeight.Bold)
                                Text("${cm(p.first)} up front", fontSize = 26.sp, fontWeight = FontWeight.ExtraBold)
                                Text((if (p.each > 0) "+ ${cm(p.each)} $per" else "Nothing after the first payment") + " · ${cm(p.yearOne)} in the first year" + (if (p.overCap >= 0 && p.overCap != p.yearOne) " · ${cm(p.overCap)} until it stops" else ""))
                            }
                            HorizontalDivider(Modifier.padding(vertical = 8.dp))
                            q.items.forEach { i ->
                                Row(Modifier.fillMaxWidth().padding(vertical = 3.dp)) {
                                    Column(Modifier.weight(1f)) {
                                        Text(i.what, fontWeight = FontWeight.SemiBold)
                                        Text("${i.price} · ${i.how}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    Column(horizontalAlignment = Alignment.End) {
                                        Text(cm(i.bonus))
                                        if (i.residual > 0) Text("+ ${cm(i.residual)}", style = MaterialTheme.typography.bodySmall)
                                    }
                                }
                            }
                            Row(Modifier.fillMaxWidth().padding(top = 4.dp)) {
                                Text("Total", fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                                Text(cm(q.bonus) + if (q.residualEach > 0) " + ${cm(q.residualEach)} $per" else "", fontWeight = FontWeight.Bold)
                            }
                            q.notes.forEach { Text("• $it", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp)) }
                            if (isOwner) {
                                Text("The company's side, first year", fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 10.dp))
                                Text("Client pays ${cm(q.clientYearOne)} · Stripe about ${cm(q.stripeYearOne)} · commission ${cm(q.paidOutYearOne)} · team pool ${cm(q.teamPoolYearOne)} · left ${cm(q.leftYearOne)} before running costs", style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                }
            }
            item {
                SectionCard("Every plan, no extras") {
                    Text("Up front = when the first payment clears. Then each later payment." + if (R.residualCapMonths > 0) " Until it stops = the first ${R.residualCapMonths} months." else "", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    s.planRows.forEach { r ->
                        HorizontalDivider(Modifier.padding(vertical = 6.dp))
                        Text("${r.plan} · ${r.billingLabel}", fontWeight = FontWeight.Bold)
                        Text("Client pays ${cm(r.clientFirst)} first · ${cm(r.bonus)} up front · + ${cm(r.residualEach)} ${if (r.interval == "year") "each renewal" else "a month"}")
                        Text("First year ${cm(r.yearOne)} · until it stops ${cm(r.overCap)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            item {
                SectionCard("Every extra") {
                    Text("Extras add to the plan's commission.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    s.extraRows.forEach { e ->
                        HorizontalDivider(Modifier.padding(vertical = 6.dp))
                        Row(Modifier.fillMaxWidth()) {
                            Column(Modifier.weight(1f)) {
                                Text(e.name, fontWeight = FontWeight.SemiBold)
                                Text("${e.price} · ${e.how}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Text(if (e.unit == "quote") "${R.quotePct.toInt()}%" else cm(e.bonus) + if (e.unit == "month") "\n+ ${cm(e.residualEach)}/mo" else "", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
            item {
                SectionCard("The rules") {
                    listOf(
                        "Plans and monthly extras: ${if (R.bonusMonths == 1.0) "one month" else "${R.bonusMonths} months"} of the price up front, then ${R.residualPct.toInt()}% of every later payment" + if (R.residualCapMonths > 0) " for ${R.residualCapMonths} months." else ".",
                        "Paid yearly: one month's price plus ${R.residualPct.toInt()}% of the yearly payment up front, then ${R.residualPct.toInt()}% of each renewal.",
                        "Month-to-month setup fee: ${R.setupPct.toInt()}% of it, up front.",
                        "One-time and per-item extras: ${R.oneTimePct.toInt()}% up front. Priced per job: ${R.quotePct.toInt()}% of what we charge. Free founder extras: nothing.",
                        "Split sales: the opener gets ${R.openerPct.toInt()}% of the up-front money, the closer the rest and every later payment. A lead stays the opener's for ${R.openerDays} days after their last logged contact.",
                        "Clawback: a cancel or refund within ${R.clawbackDays} days takes the up-front money back out of the next payout.",
                        if (R.ownerEarns) "The owner earns commission on their own sales like anyone else." else "The owner takes no commission; the owner's share stays in the company.",
                    ).forEach { Text("• $it", modifier = Modifier.padding(top = 4.dp)) }
                }
            }
        }
    }
}
