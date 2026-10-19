package com.knightdx91.websitebusiness.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.knightdx91.websitebusiness.AppState
import com.knightdx91.websitebusiness.net.AddonInfo
import com.knightdx91.websitebusiness.net.Api
import com.knightdx91.websitebusiness.net.Purchase
import com.knightdx91.websitebusiness.net.addExtras
import com.knightdx91.websitebusiness.net.planOptions
import com.knightdx91.websitebusiness.net.removeExtras
import kotlinx.coroutines.launch

/**
 * Extras added on the lead page and paid on the spot (extras-pay.ts): each unpaid order gets "💳 Take payment by tap"
 * and "⌨️ Type in the card numbers"; "➕ Add an extra now" picks extras from Settings and who approved them.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ExtrasAddSection(
    state: AppState,
    leadId: String,
    purchases: List<Purchase>,
    signer: String,
    tapReady: Boolean,
    cardReady: Boolean,
    busy: Boolean,
    onTap: (String) -> Unit,
    onCard: (String) -> Unit,
    onFile: (String) -> Unit,
    onChanged: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val muted = MaterialTheme.colorScheme.onSurfaceVariant
    // Right after Add: ask how they pay, so nothing is left "added but not charged".
    var justAdded by remember { mutableStateOf<String?>(null) }
    purchases.firstOrNull { it.id == justAdded && !it.paid }?.let { p ->
        AlertDialog(
            onDismissRequest = { justAdded = null },
            title = { Text("Take ${money(p.dueCents)} now") },
            text = { Text("${p.items.joinToString(", ")} is added but not charged yet. How do they pay?") },
            confirmButton = {
                Column(horizontalAlignment = Alignment.End) {
                    if (p.cardOnFile) TextButton(onClick = { justAdded = null; onFile(p.id) }) { Text("💳 Charge their card on file") }
                    if (tapReady) TextButton(onClick = { justAdded = null; onTap(p.id) }) { Text("💳 Take payment by tap") }
                    if (cardReady) TextButton(onClick = { justAdded = null; onCard(p.id) }) { Text("⌨️ Type in the card numbers") }
                }
            },
            dismissButton = { TextButton(onClick = { justAdded = null }) { Text("Later") } },
        )
    }
    purchases.filter { !it.paid && it.dueCents >= 50 }.forEach { p ->
        HorizontalDivider(Modifier.padding(vertical = 8.dp))
        Text(p.items.joinToString(", "), fontWeight = FontWeight.SemiBold)
        Text("${money(p.dueCents)} due · not paid yet", style = MaterialTheme.typography.bodySmall, color = Warn)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 6.dp)) {
            if (p.cardOnFile) Button(onClick = { onFile(p.id) }, enabled = !busy) { Text("💳 Charge their card on file · ${money(p.dueCents)}") }
            if (tapReady) Button(onClick = { onTap(p.id) }, enabled = !busy) { Text("💳 Take payment by tap · ${money(p.dueCents)}") }
            if (cardReady) Button(onClick = { onCard(p.id) }, enabled = !busy) { Text("⌨️ Type in the card numbers · ${money(p.dueCents)}") }
            TextButton(onClick = {
                scope.launch {
                    try { state.api.removeExtras(leadId, p.id); context.toast("Removed"); onChanged() }
                    catch (e: Api.Unauthorized) { state.signOut() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { context.toast(e.message ?: "Couldn't remove it") }
                }
            }) { Text("Remove") }
        }
        Text("⚠️ Not charged until you tap one of these.", style = MaterialTheme.typography.bodySmall, color = Warn)
        if (!tapReady && !cardReady && !p.cardOnFile) Text("Payments on the phone aren't set up yet: Settings → Tap to Pay, and the Stripe publishable key.", style = MaterialTheme.typography.bodySmall, color = muted)
    }

    var open by remember { mutableStateOf(false) }
    var addons by remember { mutableStateOf<List<AddonInfo>?>(null) }
    val picks = remember { mutableStateMapOf<Int, Int>() }
    var who by remember(signer) { mutableStateOf(signer) }
    var saving by remember { mutableStateOf(false) }
    HorizontalDivider(Modifier.padding(vertical = 8.dp))
    OutlinedButton(onClick = {
        open = !open
        if (open && addons == null) scope.launch {
            try { addons = state.api.planOptions(leadId).addons }
            catch (e: Api.Unauthorized) { state.signOut() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { context.toast(e.message ?: "Couldn't load the extras"); open = false }
        }
    }, modifier = Modifier.fillMaxWidth()) { Text(if (open) "Hide the extras" else "➕ Add an extra now (they pay here)") }
    if (!open) return
    val list = addons
    if (list == null) { Text("Loading the extras…", style = MaterialTheme.typography.bodySmall, color = muted); return }
    Column(Modifier.padding(top = 6.dp)) {
        list.forEachIndexed { i, a ->
            if (a.unit == "quote") return@forEachIndexed
            val on = picks.containsKey(i)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(checked = on, onCheckedChange = { if (it) picks[i] = 1 else picks.remove(i) })
                Column(Modifier.weight(1f)) {
                    Text(a.name, style = MaterialTheme.typography.bodyMedium)
                    Text(a.price, style = MaterialTheme.typography.bodySmall, color = muted)
                }
                if (on && a.unit == "each") {
                    TextButton(onClick = { picks[i] = ((picks[i] ?: 1) - 1).coerceAtLeast(1) }) { Text("−") }
                    Text("${picks[i] ?: 1}")
                    TextButton(onClick = { picks[i] = ((picks[i] ?: 1) + 1).coerceAtMost(20) }) { Text("+") }
                }
            }
        }
        OutlinedTextField(who, { who = it.take(80) }, label = { Text("Who approved it (their name)") }, singleLine = true, modifier = Modifier.fillMaxWidth().padding(top = 6.dp))
        Text("Their service agreement already lets us charge approved extras to their card. Monthly extras renew on the same card.", style = MaterialTheme.typography.bodySmall, color = muted, modifier = Modifier.padding(top = 4.dp))
        Button(onClick = {
            if (picks.isEmpty()) { context.toast("Tick at least one extra"); return@Button }
            if (who.trim().length < 2) { context.toast("Type the name of the person who approved it"); return@Button }
            saving = true
            scope.launch {
                try {
                    val r = state.api.addExtras(leadId, picks.toMap(), who.trim())
                    val due = r.optLong("dueCents", 0L)
                    context.toast("Added: ${r.optString("summary")}${if (due > 0) ". ${money(due)} due; take the payment below." else ""}")
                    picks.clear(); open = false
                    if (due > 0) justAdded = r.optString("purchaseId")
                    onChanged()
                } catch (e: Api.Unauthorized) { state.signOut() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) {
                    context.toast(e.message ?: "Couldn't add the extras")
                } finally { saving = false }
            }
        }, enabled = !saving && !busy, modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) { Text("Add the extras, then take payment") }
    }
}
