package com.knightdx91.websitebusiness.ui

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.LocationManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
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
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
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
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.knightdx91.websitebusiness.AppState
import com.knightdx91.websitebusiness.net.Api
import com.knightdx91.websitebusiness.net.RouteLead
import com.knightdx91.websitebusiness.net.flyerShown
import com.knightdx91.websitebusiness.net.routeLeads
import com.knightdx91.websitebusiness.webRoute
import kotlinx.coroutines.launch
import java.net.URLEncoder
import kotlin.math.asin
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

/** Where a route can start (same towns and centres as the web app). */
private data class RouteStart(val lat: Double, val lng: Double, val label: String)

private val START_TOWNS = listOf(
    RouteStart(34.1748, -86.8436, "Cullman"),
    RouteStart(34.4434, -86.9353, "Hartselle"),
    RouteStart(34.3281, -86.4958, "Arab"),
    RouteStart(34.0607, -86.7675, "Hanceville"),
    RouteStart(34.1157, -86.8636, "Good Hope"),
    RouteStart(34.2465, -86.8661, "Vinemont"),
)

/** Google Maps directions links take up to 9 stops. */
private const val MAX_STOPS = 9

private fun milesBetween(aLat: Double, aLng: Double, bLat: Double, bLng: Double): Double {
    val r = { d: Double -> d * Math.PI / 180 }
    val h = sin(r(bLat - aLat) / 2) * sin(r(bLat - aLat) / 2) + cos(r(aLat)) * cos(r(bLat)) * sin(r(bLng - aLng) / 2) * sin(r(bLng - aLng) / 2)
    return 2 * 3958.8 * asin(sqrt(h))
}

/**
 * Walk-in route (owner and callers): open leads sorted by distance from the phone (or a town), pick up to 9, nearest-next
 * order, then open the route in Google Maps. Show them their preview on the phone when you walk in.
 */
@SuppressLint("MissingPermission")
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun RouteScreen(state: AppState, nav: NavHostController) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var pool by remember { mutableStateOf<List<RouteLead>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var picked by remember { mutableStateOf<Set<String>>(emptySet()) }
    var start by remember { mutableStateOf(START_TOWNS[0]) }
    /** Index into START_TOWNS, or -1 for "Where I am now". */
    var startIdx by remember { mutableStateOf(0) }
    var category by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        try {
            pool = state.api.routeLeads().filter { r ->
                val l = r.lead
                l.lat != null && l.lng != null && l.ready && (l.salesStatus == "new" || l.salesStatus == "shown")
            }
        } catch (e: Api.Unauthorized) { state.signOut() } catch (e: Exception) { context.toast(e.message ?: "Couldn't load leads") } finally { loading = false }
    }

    fun locate() {
        val lm = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
        val loc = listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER, LocationManager.PASSIVE_PROVIDER)
            .mapNotNull { p -> runCatching { lm.getLastKnownLocation(p) }.getOrNull() }
            .maxByOrNull { it.time }
        if (loc == null) {
            context.toast("Couldn't get your location. Pick the nearest town instead.")
            start = START_TOWNS[0]
            startIdx = 0
        } else {
            start = RouteStart(loc.latitude, loc.longitude, "You")
            startIdx = -1
        }
    }
    val askLocation = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) locate() else { context.toast("Location isn't allowed. Pick a town instead."); start = START_TOWNS[0]; startIdx = 0 }
    }
    fun useMyLocation() {
        if (context.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) { context.toast("Finding you…"); locate() }
        else askLocation.launch(Manifest.permission.ACCESS_FINE_LOCATION)
    }

    fun dist(r: RouteLead) = milesBetween(start.lat, start.lng, r.lead.lat ?: 0.0, r.lead.lng ?: 0.0)

    /** Nearest stop next, starting from the start point. */
    fun order(): List<RouteLead> {
        val left = pool.filter { it.lead.id in picked }.toMutableList()
        val out = ArrayList<RouteLead>()
        var hereLat = start.lat
        var hereLng = start.lng
        while (left.isNotEmpty()) {
            val next = left.minByOrNull { milesBetween(hereLat, hereLng, it.lead.lat ?: 0.0, it.lead.lng ?: 0.0) }!!
            left.remove(next)
            out.add(next)
            hereLat = next.lead.lat ?: hereLat
            hereLng = next.lead.lng ?: hereLng
        }
        return out
    }

    /** The same Google Maps directions link the web app builds. */
    fun routeUrl(stops: List<RouteLead>): String {
        val enc = { s: String -> URLEncoder.encode(s, "UTF-8") }
        val point = { r: RouteLead -> r.lead.address?.ifBlank { null } ?: "${r.lead.lat},${r.lead.lng}" }
        val last = stops.last()
        val mid = stops.dropLast(1)
        val q = ArrayList<String>()
        q.add("api=1")
        q.add("origin=" + enc("${start.lat},${start.lng}"))
        q.add("destination=" + enc(point(last)))
        q.add("destination_place_id=" + enc(last.placeId ?: ""))
        q.add("travelmode=driving")
        if (mid.isNotEmpty()) {
            q.add("waypoints=" + enc(mid.joinToString("|") { point(it) }))
            q.add("waypoint_place_ids=" + enc(mid.joinToString("|") { it.placeId ?: "" }))
        }
        return "https://www.google.com/maps/dir/?" + q.joinToString("&")
    }

    fun flyer(id: String) {
        scope.launch {
            // Marks a New lead Shown; the printable itself is a GET with no side effects.
            runCatching { state.api.flyerShown(id) }
            nav.navigate(webRoute("/api/leads/$id/flyer"))
        }
    }

    val stops = order()
    val shown = pool.filter { category.isBlank() || it.lead.category == category }.map { it to dist(it) }.sortedBy { it.second }.take(60)

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Walk-in route") },
                navigationIcon = { IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
            )
        },
        bottomBar = {
            Surface(tonalElevation = 3.dp) {
                Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Button(onClick = { if (stops.isNotEmpty()) context.openUrl(routeUrl(stops)) }, enabled = stops.isNotEmpty(), modifier = Modifier.weight(1f)) {
                        Text(if (stops.isEmpty()) "Open route" else "Open route (${stops.size} stop${if (stops.size > 1) "s" else ""})")
                    }
                    OutlinedButton(onClick = { picked = emptySet() }) { Text("Clear") }
                }
            }
        },
    ) { pad ->
        LazyColumn(Modifier.fillMaxSize().padding(pad), contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            item {
                Text(
                    "Pick up to $MAX_STOPS businesses, then open the route in Google Maps. Show them their preview on your phone when you walk in.",
                    style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 4.dp),
                )
            }
            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        Text("Start from:", style = MaterialTheme.typography.labelLarge)
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            FilterChip(selected = startIdx == -1, onClick = { useMyLocation() }, label = { Text("📍 Where I am now") })
                            START_TOWNS.forEachIndexed { i, t ->
                                FilterChip(selected = startIdx == i, onClick = { start = t; startIdx = i }, label = { Text(t.label) })
                            }
                        }
                        Text("Category:", style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(top = 6.dp))
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            FilterChip(selected = category.isBlank(), onClick = { category = "" }, label = { Text("All") })
                            CATEGORY_LABEL.forEach { (k, v) -> FilterChip(selected = category == k, onClick = { category = k }, label = { Text(v) }) }
                        }
                    }
                }
            }
            if (loading) item { LinearProgressIndicator(Modifier.fillMaxWidth()) }
            if (!loading && shown.isEmpty()) {
                item { Text("No open leads with a location${if (category.isNotBlank()) " in this category" else ""}.", color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(8.dp)) }
            }
            items(shown, key = { it.first.lead.id }) { (r, d) ->
                val l = r.lead
                val isPicked = l.id in picked
                val canPick = isPicked || picked.size < MAX_STOPS
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(8.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(checked = isPicked, enabled = canPick, onCheckedChange = { on -> picked = if (on) picked + l.id else picked - l.id })
                            Column(Modifier.weight(1f).clickable { nav.navigate("lead/${l.id}") }) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(l.name, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                                    Text("%.1f mi".format(d), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Text("${categoryLabel(l.category)} · ${l.reason ?: ""}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text(l.address ?: "", style = MaterialTheme.typography.bodySmall)
                                l.followUp?.let { fu ->
                                    val late = fu < dayFromNow(0)
                                    Text("📅 ${if (late) "Overdue: " else "Call back "}${niceDay(fu)}", style = MaterialTheme.typography.labelMedium, color = if (fu <= dayFromNow(0)) Warn else MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.padding(start = 40.dp)) {
                            Button(onClick = { nav.navigate(webRoute("/#/walkin/${l.id}")) }, contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)) { Text("🚶 Guide") }
                            TextButton(onClick = { nav.navigate(webRoute("/#/preview/${l.id}")) }, contentPadding = PaddingValues(horizontal = 8.dp)) { Text("Preview") }
                            TextButton(onClick = { flyer(l.id) }, contentPadding = PaddingValues(horizontal = 8.dp)) { Text("Flyer") }
                        }
                    }
                }
            }
        }
    }
}
