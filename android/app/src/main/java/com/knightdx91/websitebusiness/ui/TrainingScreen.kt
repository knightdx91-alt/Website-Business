package com.knightdx91.websitebusiness.ui

import androidx.compose.foundation.clickable
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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.knightdx91.websitebusiness.AppState
import com.knightdx91.websitebusiness.net.Api
import com.knightdx91.websitebusiness.net.Course
import com.knightdx91.websitebusiness.net.Lesson
import com.knightdx91.websitebusiness.net.markLesson
import com.knightdx91.websitebusiness.net.training
import kotlinx.coroutines.launch

/**
 * 🎓 Training (owner and callers): the course from `GET /api/training`, one lesson open at a time, with the exact
 * buttons to tap, a "try it now" exercise, quick-check questions and a Mark done button. Progress is per person.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TrainingScreen(state: AppState, nav: NavHostController) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var course by remember { mutableStateOf<Course?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var openId by rememberSaveable { mutableStateOf<String?>(null) }
    val picks = remember { mutableStateMapOf<String, Int>() }

    LaunchedEffect(Unit) {
        try {
            course = state.api.training()
        } catch (e: Api.Unauthorized) {
            state.signOut()
        } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) {
            error = e.message
        }
    }

    fun mark(l: Lesson, done: Boolean) {
        scope.launch {
            try {
                val doneIds = state.api.markLesson(l.id, done)
                course = course?.copy(done = doneIds)
                if (done) openId = course?.lessons?.firstOrNull { it.id !in doneIds }?.id
            } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) {
                context.toast(e.message ?: "Couldn't save")
            }
        }
    }

    Scaffold(topBar = {
        TopAppBar(title = { Text("🎓 Training") }, navigationIcon = { IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } })
    }) { pad ->
        val c = course
        when {
            error != null -> Column(Modifier.padding(pad).padding(16.dp)) { Text(error!!, color = MaterialTheme.colorScheme.error) }
            c == null -> Column(Modifier.fillMaxSize().padding(pad), horizontalAlignment = Alignment.CenterHorizontally) { Spacer(Modifier.height(48.dp)); CircularProgressIndicator() }
            else -> {
                val n = c.lessons.count { it.id in c.done }
                val total = c.lessons.sumOf { it.minutes }
                LazyColumn(Modifier.fillMaxSize().padding(pad), contentPadding = PaddingValues(12.dp, 8.dp, 12.dp, 32.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    item {
                        Card(Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(14.dp)) {
                                Text("The whole job, from a lead appearing to a live site on the client's own domain. ${c.lessons.size} short lessons, about $total minutes in all. Each has the exact buttons to tap, something to try, and a quick check. Your progress is saved.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Spacer(Modifier.height(10.dp))
                                Text(if (n == c.lessons.size) "🎉 All done. Come back any time." else "$n of ${c.lessons.size} done", fontWeight = FontWeight.Bold)
                                LinearProgressIndicator(progress = { n.toFloat() / c.lessons.size }, modifier = Modifier.fillMaxWidth().padding(top = 6.dp))
                                Text("Practice on the lead called “Payment test (not a real business)”: it only ever charges $1 and starts no plan.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 8.dp))
                            }
                        }
                    }
                    items(c.lessons, key = { it.id }) { l ->
                        val done = l.id in c.done
                        val open = openId == l.id
                        val index = c.lessons.indexOf(l) + 1
                        Card(Modifier.fillMaxWidth(), colors = if (done) CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant) else CardDefaults.cardColors()) {
                            Column(Modifier.padding(14.dp)) {
                                Row(Modifier.fillMaxWidth().clickable { openId = if (open) null else l.id }, verticalAlignment = Alignment.CenterVertically) {
                                    Column(Modifier.weight(1f)) {
                                        Text("${if (done) "✅" else "$index."} ${l.title}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                        Text("${l.minutes} min${if (l.ownerStep) " · " + (if (state.meta?.isOwner == true) "Owner step" else "Owner does this; know what happens") else ""}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    Text(if (open) "▴" else "▾", color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                if (open) {
                                    Spacer(Modifier.height(8.dp))
                                    Text(l.why, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Spacer(Modifier.height(8.dp))
                                    l.steps.forEachIndexed { i, s ->
                                        Row(Modifier.padding(vertical = 4.dp)) {
                                            Text("${i + 1}.", fontWeight = FontWeight.Bold, modifier = Modifier.width(26.dp))
                                            Text(s, style = MaterialTheme.typography.bodyMedium)
                                        }
                                    }
                                    l.tryIt?.let {
                                        Card(Modifier.fillMaxWidth().padding(top = 8.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.tertiaryContainer)) {
                                            Column(Modifier.padding(12.dp)) {
                                                Text("Try it now", fontWeight = FontWeight.Bold)
                                                Text(it, style = MaterialTheme.typography.bodyMedium)
                                            }
                                        }
                                    }
                                    l.check.forEachIndexed { qi, q ->
                                        val key = "${l.id}#$qi"
                                        val picked = picks[key]
                                        Spacer(Modifier.height(10.dp))
                                        Text("Quick check: ${q.q}", fontWeight = FontWeight.SemiBold)
                                        q.options.forEachIndexed { oi, o ->
                                            Row(Modifier.fillMaxWidth().clickable { picks[key] = oi }, verticalAlignment = Alignment.CenterVertically) {
                                                RadioButton(selected = picked == oi, onClick = { picks[key] = oi })
                                                Text(o, style = MaterialTheme.typography.bodyMedium)
                                            }
                                        }
                                        if (picked != null) {
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                AssistChip(onClick = {}, label = { Text(if (picked == q.answer) "Correct" else "Not quite") })
                                                Spacer(Modifier.width(8.dp))
                                                Text(q.why, style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                                            }
                                        }
                                    }
                                    Spacer(Modifier.height(12.dp))
                                    if (done) OutlinedButton(onClick = { mark(l, false) }) { Text("Mark not done") }
                                    else Button(onClick = { mark(l, true) }) { Text("✓ Mark done") }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
