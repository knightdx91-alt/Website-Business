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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
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
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.knightdx91.websitebusiness.AppState
import com.knightdx91.websitebusiness.net.ClockEntry
import com.knightdx91.websitebusiness.net.ClockStatus
import com.knightdx91.websitebusiness.net.TeamPerson
import com.knightdx91.websitebusiness.net.TeamWeek
import com.knightdx91.websitebusiness.net.addShift
import com.knightdx91.websitebusiness.net.clockIn
import com.knightdx91.websitebusiness.net.clockOut
import com.knightdx91.websitebusiness.net.clockStatus
import com.knightdx91.websitebusiness.net.deleteShift
import com.knightdx91.websitebusiness.net.editShift
import com.knightdx91.websitebusiness.net.teamWeek
import com.knightdx91.websitebusiness.net.timesheetCsv
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/*
 * Time clock (Oct 2026): hourly team members clock in and out from the top of Tasks; the owner / full access see
 * everyone's week in Timesheets, fix a forgotten punch, add a missed shift and download the week for payroll.
 */

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ClockCard(state: AppState, nav: NavHostController) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val isOwner = state.meta?.isOwner == true
    var st by remember { mutableStateOf<ClockStatus?>(null) }
    var note by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var nowMs by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) {
        try { st = state.api.clockStatus() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { /* no card */ }
    }
    LaunchedEffect(st?.open?.id) {
        while (st?.open != null) { nowMs = System.currentTimeMillis(); delay(20_000) }
    }
    val s = st ?: return
    if (!s.canClock && !isOwner) return
    val open = s.open
    Card(
        Modifier.fillMaxWidth(),
        colors = if (open != null) CardDefaults.cardColors(containerColor = Good.copy(alpha = 0.12f)) else CardDefaults.cardColors(),
    ) {
        Column(Modifier.padding(14.dp)) {
            Text(if (open != null) "⏱ You're on the clock" else "⏱ Time clock", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            if (!s.canClock) {
                Text("Set someone's hourly pay in Settings → Team and they get a Clock in button here.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                OutlinedButton(onClick = { nav.navigate("timesheet") }, modifier = Modifier.padding(top = 6.dp)) { Text("🗂️ Timesheets") }
                return@Column
            }
            val week = "This week: ${hoursText(s.weekMinutes)}" + if (s.weekPayCents > 0) " · about ${money(s.weekPayCents)}" else ""
            if (open != null) {
                Text(hoursText(((nowMs - open.clockIn) / 60_000).toInt().coerceAtLeast(0)), fontSize = 30.sp, fontWeight = FontWeight.ExtraBold)
                Text("Since ${clockTime(open.clockIn)}" + if (open.note.isNotBlank()) " · ${open.note}" else "", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else {
                Text("Today: ${hoursText(s.todayMinutes)} · $week", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            OutlinedTextField(note, { note = it }, label = { Text(if (open != null) "What you got done (optional)" else "What you're working on (optional)") }, singleLine = true, modifier = Modifier.fillMaxWidth().padding(top = 6.dp))
            Row(Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                Button(
                    onClick = {
                        busy = true
                        scope.launch {
                            try {
                                val e = if (open != null) state.api.clockOut(note) else state.api.clockIn(note)
                                context.toast(if (open != null) "Clocked out: ${hoursText(e.minutes)}" else "Clocked in")
                                note = ""
                                st = state.api.clockStatus()
                            } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { context.toast(e.message ?: "Couldn't do that") } finally { busy = false }
                        }
                    },
                    enabled = !busy,
                    modifier = Modifier.weight(1f),
                ) { Text(if (open != null) "⏹ Clock out" else "▶ Clock in") }
                if (isOwner) OutlinedButton(onClick = { nav.navigate("timesheet") }) { Text("🗂️ Timesheets") }
            }
            if (open != null) Text(week, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 6.dp))
            if (s.entries.isNotEmpty()) {
                var showMine by remember { mutableStateOf(false) }
                TextButton(onClick = { showMine = !showMine }, contentPadding = PaddingValues(0.dp)) { Text(if (showMine) "Hide my hours" else "My hours, this week and last") }
                if (showMine) s.entries.forEach { e -> Text(entryLine(e), style = MaterialTheme.typography.bodySmall) }
            }
        }
    }
}

private fun entryLine(e: ClockEntry): String =
    "${prettyDay(e.day)} ${clockTime(e.clockIn)} – ${e.clockOut?.let { clockTime(it) } ?: "now"} · ${hoursText(e.minutes)}" +
        (if (e.payCents > 0) " · ${money(e.payCents)}" else "") +
        (if (e.note.isNotBlank()) " · ${e.note}" else "") +
        (e.editedBy?.let { " (changed by $it)" } ?: "")

private sealed class ShiftDlg {
    data class Edit(val e: ClockEntry) : ShiftDlg()
    data class Add(val people: List<TeamPerson>) : ShiftDlg()
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun TimesheetScreen(state: AppState, nav: NavHostController) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var week by remember { mutableStateOf<String?>(null) }
    var data by remember { mutableStateOf<TeamWeek?>(null) }
    var error by remember { mutableStateOf("") }
    var dlg by remember { mutableStateOf<ShiftDlg?>(null) }

    suspend fun load() {
        try { data = state.api.teamWeek(week); error = "" } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { error = e.message ?: "Couldn't load timesheets" }
    }
    LaunchedEffect(week) { load() }

    Scaffold(topBar = {
        TopAppBar(title = { Text("🗂️ Timesheets") }, navigationIcon = { IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } })
    }) { pad ->
        LazyColumn(Modifier.fillMaxSize().padding(pad), contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            if (error.isNotBlank()) item { Text(error, color = Warn) }
            val w = data
            if (w == null) {
                if (error.isBlank()) item { Text("Loading…", color = MaterialTheme.colorScheme.onSurfaceVariant) }
                return@LazyColumn
            }
            val thisWeek = w.from <= dayFromNow(0) && dayFromNow(0) <= w.to
            item {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    TextButton(onClick = { week = shiftDays(w.from, -7) }) { Text("← Before") }
                    Text("${prettyDay(w.from)} – ${prettyDay(w.to)}" + if (thisWeek) "\n(this week)" else "", fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                    if (!thisWeek) TextButton(onClick = { week = shiftDays(w.from, 7) }) { Text("After →") }
                }
            }
            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        Text("Everyone: ${hoursText(w.totalMinutes)} · ${money(w.totalPayCents)}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text("Hourly pay only (commission is on Sales). A shift counts on the day it started. Set pay in Settings → Team; a change applies to shifts started after it.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 6.dp)) {
                            OutlinedButton(onClick = {
                                scope.launch {
                                    try {
                                        val where = saveToDownloads(context, "timesheet-${w.from}.csv", state.api.timesheetCsv(w.from), "text/csv")
                                        context.toast("Saved to $where")
                                    } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { context.toast(e.message ?: "Couldn't download") }
                                }
                            }) { Text("⬇ Download this week (CSV)") }
                            if (w.people.isNotEmpty()) OutlinedButton(onClick = { dlg = ShiftDlg.Add(w.people) }) { Text("➕ Add a missed shift") }
                        }
                    }
                }
            }
            if (w.people.isEmpty()) item { Text("Nobody has hourly pay yet. Set it in Settings → Team.", color = MaterialTheme.colorScheme.onSurfaceVariant) }
            w.people.forEach { p ->
                item(key = p.userId) {
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(14.dp)) {
                            Text(p.name + if (p.open) "  · on the clock" else "", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = if (p.open) Good else MaterialTheme.colorScheme.onSurface)
                            Text(hoursText(p.minutes) + (p.hourlyCents?.let { " · ${money(it)}/hr · ${money(p.payCents)}" } ?: " · no hourly pay set"), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            if (p.entries.isEmpty()) Text("No shifts this week.", style = MaterialTheme.typography.bodySmall)
                            p.entries.forEach { e ->
                                HorizontalDivider(Modifier.padding(vertical = 6.dp))
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(entryLine(e), style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                                    TextButton(onClick = { dlg = ShiftDlg.Edit(e) }) { Text("Fix") }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    when (val d = dlg) {
        null -> {}
        is ShiftDlg.Edit -> ShiftDialog(
            title = "Fix ${d.e.userName}'s shift",
            people = null,
            entry = d.e,
            onDismiss = { dlg = null },
            onDelete = {
                scope.launch {
                    try { state.api.deleteShift(d.e.id); dlg = null; load() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { context.toast(e.message ?: "Couldn't delete") }
                }
            },
        ) { _, inDay, inTime, outDay, outTime, note ->
            scope.launch {
                try { state.api.editShift(d.e.id, inDay, inTime, outDay, outTime, note); dlg = null; context.toast("Shift saved"); load() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { context.toast(e.message ?: "Couldn't save") }
            }
        }
        is ShiftDlg.Add -> ShiftDialog(
            title = "Add a missed shift",
            people = d.people,
            entry = null,
            onDismiss = { dlg = null },
            onDelete = null,
        ) { userId, inDay, inTime, outDay, outTime, note ->
            if (userId == null || outTime == null) { context.toast("Pick who and both times"); return@ShiftDialog }
            scope.launch {
                try { state.api.addShift(userId, inDay, inTime, outDay, outTime, note); dlg = null; context.toast("Shift added"); load() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { context.toast(e.message ?: "Couldn't add") }
            }
        }
    }
}

private fun shiftDays(day: String, n: Int): String {
    var d = day
    if (n > 0) repeat(n) { d = nextDay(d) } else {
        val c = java.util.Calendar.getInstance(java.util.TimeZone.getTimeZone("UTC"))
        val f = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).apply { timeZone = java.util.TimeZone.getTimeZone("UTC") }
        c.time = f.parse(day)!!
        c.add(java.util.Calendar.DAY_OF_MONTH, n)
        d = f.format(c.time)
    }
    return d
}

/** Date + clock-in + clock-out pickers. Leaving clock out empty on a fix keeps them on the clock. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ShiftDialog(
    title: String,
    people: List<TeamPerson>?,
    entry: ClockEntry?,
    onDismiss: () -> Unit,
    onDelete: (() -> Unit)?,
    onSave: (userId: String?, inDay: String, inTime: String, outDay: String?, outTime: String?, note: String) -> Unit,
) {
    var who by remember { mutableStateOf(people?.firstOrNull()?.userId) }
    var day by remember { mutableStateOf(entry?.let { cullmanDay(it.clockIn) } ?: dayFromNow(0)) }
    var inTime by remember { mutableStateOf(entry?.let { cullmanTime(it.clockIn) }) }
    var outTime by remember { mutableStateOf(entry?.clockOut?.let { cullmanTime(it) }) }
    var overnight by remember { mutableStateOf(entry?.clockOut?.let { cullmanDay(it) != cullmanDay(entry.clockIn) } ?: false) }
    var note by remember { mutableStateOf(entry?.note ?: "") }
    var confirmDelete by remember { mutableStateOf(false) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                if (people != null) FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    people.forEach { p -> FilterChip(selected = who == p.userId, onClick = { who = p.userId }, label = { Text(p.name) }) }
                }
                Text("Date", style = MaterialTheme.typography.labelLarge)
                DateButton(day, { if (it != null) day = it }, clearable = false)
                Text("Clock in", style = MaterialTheme.typography.labelLarge)
                TimeButton(inTime, { inTime = it }, clearable = false)
                Text("Clock out", style = MaterialTheme.typography.labelLarge)
                TimeButton(outTime, { outTime = it }, placeholder = if (people == null) "🕐 Still on the clock" else "🕐 Pick a time", clearable = people == null)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(overnight, { overnight = it })
                    Text("Clocked out the next day (past midnight)", style = MaterialTheme.typography.bodySmall)
                }
                OutlinedTextField(note, { note = it }, label = { Text("Note (optional)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                if (onDelete != null) TextButton(onClick = { if (confirmDelete) onDelete() else confirmDelete = true }) { Text(if (confirmDelete) "Tap again to delete this shift" else "Delete shift", color = Warn) }
            }
        },
        confirmButton = {
            TextButton(enabled = inTime != null, onClick = {
                val out = outTime
                onSave(who, day, inTime!!, if (out != null && overnight) nextDay(day) else null, out, note.trim())
            }) { Text("Save") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}
