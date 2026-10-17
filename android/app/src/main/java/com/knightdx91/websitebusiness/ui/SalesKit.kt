package com.knightdx91.websitebusiness.ui

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.layout.wrapContentSize
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.knightdx91.websitebusiness.net.Meta

/* Small pieces shared by Plans & answers, Show plans and the In-person guide. */

/** "Hi, this is Fox with Underground Associates." (the owner uses the caller name from Settings; team members their own). */
fun greetingFor(meta: Meta?): String {
    val me = meta?.senderName ?: ""
    val co = meta?.companyName?.ifBlank { null }
    return "Hi, this is ${me.ifBlank { "me" }}${if (co != null) " with $co" else ""}."
}

fun Context.copyText(label: String, text: String) {
    (getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager).setPrimaryClip(ClipData.newPlainText(label, text))
}

/** A bulleted list. */
@Composable
fun Bullets(items: List<String>, modifier: Modifier = Modifier) {
    Column(modifier) {
        items.forEach { Text("• $it", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 4.dp)) }
    }
}

/** A line to say out loud, in quotes. */
@Composable
fun SayLine(text: String) {
    Text("“$text”", style = MaterialTheme.typography.bodyLarge, fontStyle = FontStyle.Italic, fontWeight = FontWeight.Medium, modifier = Modifier.padding(vertical = 6.dp))
}

/** Question → answer, closed until tapped (`forceOpen` opens it while searching). */
@Composable
fun ObjectionRow(question: String, answer: String, forceOpen: Boolean = false) {
    var open by remember(question) { mutableStateOf(false) }
    Column(Modifier.fillMaxWidth().clickable { open = !open }.padding(vertical = 6.dp)) {
        Text("${if (open || forceOpen) "▾" else "▸"} $question", fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodyMedium)
        if (open || forceOpen) Text(answer, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(start = 14.dp, top = 4.dp))
    }
}

/** A numbered step of the in-person guide; `highlight` tints the ones where you talk. */
@Composable
fun StepCard(n: Int, title: String, highlight: Boolean = false, content: @Composable () -> Unit) {
    Card(
        Modifier.fillMaxWidth(),
        colors = if (highlight) CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer) else CardDefaults.cardColors(),
    ) {
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "$n",
                    color = Color.White,
                    style = MaterialTheme.typography.labelLarge,
                    modifier = Modifier.size(26.dp).background(Navy, CircleShape).wrapContentSize(Alignment.Center),
                )
                Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 8.dp))
            }
            content()
        }
    }
}
