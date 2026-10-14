package com.knightdx91.websitebusiness.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/*
 * Calendar and clock pop-ups (Oct 2026, owner's ask: tasks need a real date and time, not just the callback chips).
 * Days are YYYY-MM-DD and times HH:MM (24 h), Cullman time, the way the Worker stores them.
 */

private val UTC: TimeZone = TimeZone.getTimeZone("UTC")

/** The DatePicker works in UTC midnight millis. */
private fun dayToUtcMillis(day: String): Long? = runCatching {
    SimpleDateFormat("yyyy-MM-dd", Locale.US).apply { timeZone = UTC }.parse(day)?.time
}.getOrNull()

private fun utcMillisToDay(ms: Long): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply { timeZone = UTC }.format(Date(ms))

/** "Tue, Oct 14" (with "Today" / "Tomorrow" when it is). */
fun prettyDay(day: String): String {
    if (day == dayFromNow(0)) return "Today"
    if (day == dayFromNow(1)) return "Tomorrow"
    val ms = dayToUtcMillis(day) ?: return day
    return SimpleDateFormat("EEE, MMM d", Locale.US).apply { timeZone = UTC }.format(Date(ms))
}

/** "14:30" → "2:30 PM". */
fun prettyTime(time: String): String {
    val (h, m) = time.split(":").map { it.toIntOrNull() ?: 0 }.let { (it.getOrNull(0) ?: 0) to (it.getOrNull(1) ?: 0) }
    return "${if (h % 12 == 0) 12 else h % 12}:${m.toString().padStart(2, '0')} ${if (h < 12) "AM" else "PM"}"
}

/** Clock time of an instant in Cullman, "2:30 PM". */
fun clockTime(ms: Long): String = SimpleDateFormat("h:mm a", Locale.US).apply { timeZone = CULLMAN }.format(Date(ms))

/** An instant as Cullman date + 24 h time, for prefilling the pickers. */
fun cullmanDay(ms: Long): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply { timeZone = CULLMAN }.format(Date(ms))
fun cullmanTime(ms: Long): String = SimpleDateFormat("HH:mm", Locale.US).apply { timeZone = CULLMAN }.format(Date(ms))

fun nextDay(day: String): String {
    val ms = dayToUtcMillis(day) ?: return day
    return utcMillisToDay(ms + 86_400_000L)
}

fun hoursText(min: Int): String = "${min / 60}h ${(min % 60).toString().padStart(2, '0')}m"

/** A button that shows the picked day and opens a calendar. `onPick(null)` clears it when `clearable`. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DateButton(day: String?, onPick: (String?) -> Unit, modifier: Modifier = Modifier, placeholder: String = "📅 Pick a date", clearable: Boolean = true) {
    var open by remember { mutableStateOf(false) }
    Row(modifier, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        OutlinedButton(onClick = { open = true }) { Text(if (day != null) "📅 ${prettyDay(day)}" else placeholder) }
        if (clearable && day != null) TextButton(onClick = { onPick(null) }) { Text("Clear") }
    }
    if (open) {
        val state = rememberDatePickerState(initialSelectedDateMillis = day?.let { dayToUtcMillis(it) } ?: dayToUtcMillis(dayFromNow(0)))
        DatePickerDialog(
            onDismissRequest = { open = false },
            confirmButton = {
                TextButton(onClick = {
                    state.selectedDateMillis?.let { onPick(utcMillisToDay(it)) }
                    open = false
                }) { Text("OK") }
            },
            dismissButton = { TextButton(onClick = { open = false }) { Text("Cancel") } },
        ) { DatePicker(state = state) }
    }
}

/** A button that shows the picked time and opens a clock face. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TimeButton(time: String?, onPick: (String?) -> Unit, modifier: Modifier = Modifier, placeholder: String = "🕐 Pick a time", clearable: Boolean = true) {
    var open by remember { mutableStateOf(false) }
    Row(modifier, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        OutlinedButton(onClick = { open = true }) { Text(if (time != null) "🕐 ${prettyTime(time)}" else placeholder) }
        if (clearable && time != null) TextButton(onClick = { onPick(null) }) { Text("Clear") }
    }
    if (open) {
        val now = Calendar.getInstance(CULLMAN)
        val (h, m) = time?.split(":")?.map { it.toIntOrNull() ?: 0 }?.let { (it.getOrNull(0) ?: 9) to (it.getOrNull(1) ?: 0) }
            ?: ((now.get(Calendar.HOUR_OF_DAY) + 1).coerceAtMost(23) to 0)
        val state = rememberTimePickerState(initialHour = h, initialMinute = m, is24Hour = false)
        AlertDialog(
            onDismissRequest = { open = false },
            title = { Text("Pick a time") },
            text = { TimePicker(state = state, modifier = Modifier.padding(top = 8.dp)) },
            confirmButton = {
                TextButton(onClick = {
                    onPick("${state.hour.toString().padStart(2, '0')}:${state.minute.toString().padStart(2, '0')}")
                    open = false
                }) { Text("OK") }
            },
            dismissButton = { TextButton(onClick = { open = false }) { Text("Cancel") } },
        )
    }
}
