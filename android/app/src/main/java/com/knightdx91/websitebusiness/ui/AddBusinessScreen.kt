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
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.knightdx91.websitebusiness.AppState
import com.knightdx91.websitebusiness.net.Api
import com.knightdx91.websitebusiness.net.PlaceResult
import com.knightdx91.websitebusiness.net.addLead
import com.knightdx91.websitebusiness.net.searchPlaces
import kotlinx.coroutines.launch

/** The template packs a hand-added business can use (same list and wording as the web app's PACKS). */
private val ADD_PACKS = listOf(
    "restaurant" to "Restaurant, cafe, bakery or food truck",
    "contractor" to "Contractor or home service (plumbing, HVAC, painting, concrete, tree, pest…)",
    "salon" to "Salon, barber, nails, massage or pet grooming",
    "auto" to "Auto repair, body shop, detailing, towing or small engine",
    "landscaping" to "Landscaping or lawn care",
    "cleaning" to "Cleaning or pressure washing",
    "finance" to "Tax preparer, accountant, insurance agency or financial advisor",
    "church" to "Church, VFW/Legion/Lions/lodge, food pantry or community center",
    "print" to "Print shop, sign shop, screen printing or embroidery",
    "retail" to "Shop: boutique, gifts, florist, antiques, thrift, feed or furniture",
    "general" to "Something else: gym, clinic, daycare, studio, repair shop, any local business",
)

/** Website status label and whether it's a good sign (true) or a caution (false). */
private val ADD_PRESENCE = mapOf(
    "none" to ("No website" to true),
    "social" to ("Only a social page" to true),
    "elsewhere" to ("Page on another site" to true),
    "free_builder" to ("Free-builder site" to false),
    "outdated" to ("Outdated website" to false),
    "has_site" to ("Has a website" to false),
)

/** Owner and callers: look a business up on Google and build its site, just like a run. */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun AddBusinessScreen(state: AppState, nav: NavHostController) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var q by remember { mutableStateOf("") }
    var searching by remember { mutableStateOf(false) }
    var searched by remember { mutableStateOf(false) }
    var results by remember { mutableStateOf<List<PlaceResult>>(emptyList()) }
    // Per result (by index): the picked template, the typed phone, and whether an add is in flight.
    var picks by remember { mutableStateOf<Map<Int, String>>(emptyMap()) }
    var phones by remember { mutableStateOf<Map<Int, String>>(emptyMap()) }
    var adding by remember { mutableStateOf<Int?>(null) }

    fun search() {
        val text = q.trim()
        if (text.length < 3) return context.toast("Type at least 3 letters")
        searching = true
        scope.launch {
            try {
                val r = state.api.searchPlaces(text)
                results = r
                picks = r.mapIndexedNotNull { i, x -> x.category?.let { i to it } }.toMap()
                phones = emptyMap()
                searched = true
            } catch (e: Api.Unauthorized) { state.signOut() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { context.toast(e.message ?: "Search failed") } finally { searching = false }
        }
    }

    fun add(i: Int, x: PlaceResult) {
        val category = picks[i]
        if (category.isNullOrBlank()) return context.toast("Pick the kind of business first")
        val typed = if (x.phone == null) phones[i].orEmpty().trim() else null
        if (typed != null && phoneDigits(typed).length < 10) return context.toast("Type their phone number first")
        adding = i
        scope.launch {
            try {
                val res = state.api.addLead(x.placeId, category, typed)
                context.toast(if (res.existed) "It's already in your leads" else "Added! Building the site now (about a minute).")
                nav.navigate("lead/${res.id}")
            } catch (e: Api.Unauthorized) { state.signOut() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { context.toast(e.message ?: "Couldn't add it") } finally { adding = null }
        }
    }

    Scaffold(topBar = {
        TopAppBar(
            title = { Text("Add a business") },
            navigationIcon = { IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
        )
    }) { pad ->
        LazyColumn(Modifier.fillMaxSize().padding(pad), contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            item {
                Text(
                    "Found a business on a call, a drive or a tip? Look it up on Google and build its site, just like a run.",
                    style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 4.dp),
                )
            }
            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        OutlinedTextField(
                            q, { q = it.take(120) },
                            label = { Text("Business name") },
                            placeholder = { Text("e.g. Rusty's Diner") },
                            supportingText = { Text("Add the town if it's not in Cullman, e.g. “Smith Plumbing Hartselle”") },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                            keyboardActions = KeyboardActions(onSearch = { search() }),
                            modifier = Modifier.fillMaxWidth(),
                        )
                        Button(onClick = { search() }, enabled = !searching && q.trim().length >= 3, modifier = Modifier.padding(top = 8.dp)) { Text(if (searching) "Searching…" else "Search Google") }
                    }
                }
            }
            if (searching) item { LinearProgressIndicator(Modifier.fillMaxWidth()) }
            if (searched && results.isEmpty()) {
                item { Card(Modifier.fillMaxWidth()) { Text("No matches. Try the exact name from their sign, or add the town.", Modifier.padding(14.dp), color = MaterialTheme.colorScheme.onSurfaceVariant) } }
            }
            itemsIndexed(results, key = { i, x -> x.placeId.ifBlank { "r$i" } }) { i, x ->
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        val presence = ADD_PRESENCE[x.presence]
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(x.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                            if (presence != null) Text(presence.first, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = if (presence.second) Good else Warn)
                        }
                        val meta1 = listOfNotNull(x.type, x.rating?.let { "★ ${"%.1f".format(it)} (${x.reviews})" }).joinToString(" · ")
                        if (meta1.isNotBlank()) Text(meta1, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(listOfNotNull(x.address.ifBlank { null }, x.phone).joinToString(" · "), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        if (x.website != null && x.presence != "none") {
                            Text("Website: " + x.website.replace(Regex("^https?://"), "").take(60), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        val warn = listOfNotNull(
                            if (!x.open) "Google lists it as closed" else null,
                            if (x.chain) "Looks like a chain" else null,
                            if (x.phone == null) "No phone number on Google: type it in below (from their sign, Facebook or the owner)" else null,
                        )
                        if (warn.isNotEmpty()) Text("⚠️ " + warn.joinToString(" · "), style = MaterialTheme.typography.bodySmall, color = Warn, modifier = Modifier.padding(top = 4.dp))

                        val existing = x.existing
                        if (existing != null) {
                            OutlinedButton(onClick = { nav.navigate("lead/${existing.id}") }, modifier = Modifier.padding(top = 8.dp)) { Text("Already in your leads: open it") }
                        } else {
                            if (x.phone == null) {
                                OutlinedTextField(
                                    phones[i] ?: "", { v -> phones = phones + (i to v.take(30)) },
                                    label = { Text("Their phone number") },
                                    placeholder = { Text("(256) 555-0123") },
                                    singleLine = true,
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                                    modifier = Modifier.fillMaxWidth().padding(top = 6.dp),
                                )
                            }
                            Text("Kind of business:", style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(top = 8.dp))
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                ADD_PACKS.forEach { (id, _) ->
                                    FilterChip(selected = picks[i] == id, onClick = { picks = picks + (i to id) }, label = { Text(categoryLabel(id)) })
                                }
                            }
                            val pickedLabel = ADD_PACKS.firstOrNull { it.first == picks[i] }?.second
                            Text(pickedLabel ?: "Pick the kind of business…", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp))
                            Button(onClick = { add(i, x) }, enabled = adding == null, modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) {
                                Text(if (adding == i) "Adding…" else "Add & build site")
                            }
                        }
                    }
                }
            }
            item {
                Card(Modifier.fillMaxWidth()) {
                    Text(
                        "Not on Google? Their website needs Google's details (hours, map, reviews), so they need a Google Business Profile first. That's your Google profile setup extra. Once their listing is live, search for it here.",
                        Modifier.padding(14.dp), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}
