package com.knightdx91.websitebusiness.ui

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Row
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material3.Icon
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.knightdx91.websitebusiness.net.Api

/** A card with a bold title, the way every screen lays out its sections. */
@Composable
fun SectionCard(title: String, modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Card(modifier.fillMaxWidth()) {
        Column(Modifier.padding(14.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            content()
        }
    }
}

/**
 * A section that opens when its header is tapped and closes the same way (Settings: most sections are rarely edited, so
 * they start closed and the page stays short). Open/closed is remembered per title while the screen lives. Form state
 * must be hoisted outside the card, as Settings does, so closing a section never loses typed values.
 */
@Composable
fun CollapsibleCard(title: String, modifier: Modifier = Modifier, defaultOpen: Boolean = false, summary: String? = null, content: @Composable () -> Unit) {
    var open by rememberSaveable(title) { mutableStateOf(defaultOpen) }
    Card(modifier.fillMaxWidth()) {
        Column(Modifier.padding(14.dp)) {
            Row(Modifier.fillMaxWidth().clickable { open = !open }, verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    if (!open && !summary.isNullOrBlank()) Text(summary, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Icon(if (open) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown, if (open) "Collapse" else "Expand", tint = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            if (open) content()
        }
    }
}

/** An image behind the login (preview photos, gallery thumbnails): fetched with the session token, decoded small. */
@Composable
fun AuthImage(api: Api, path: String, modifier: Modifier = Modifier, maxPx: Int = 600, contentScale: ContentScale = ContentScale.Crop) {
    var bmp by remember(path) { mutableStateOf<Bitmap?>(null) }
    LaunchedEffect(path) {
        bmp = runCatching {
            val bytes = api.bytes(path)
            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
            var sample = 1
            while (bounds.outWidth / sample > maxPx * 2 || bounds.outHeight / sample > maxPx * 2) sample *= 2
            BitmapFactory.decodeByteArray(bytes, 0, bytes.size, BitmapFactory.Options().apply { inSampleSize = sample })
        }.getOrNull()
    }
    val b = bmp
    if (b != null) Image(b.asImageBitmap(), contentDescription = null, modifier = modifier, contentScale = contentScale)
    else Box(modifier)
}
