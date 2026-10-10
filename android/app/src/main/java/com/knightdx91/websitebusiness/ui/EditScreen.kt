package com.knightdx91.websitebusiness.ui

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
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
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.knightdx91.websitebusiness.AppState
import com.knightdx91.websitebusiness.net.Api
import com.knightdx91.websitebusiness.net.objects
import com.knightdx91.websitebusiness.net.str
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.ByteArrayOutputStream

/** One field of the server-described edit form (`GET /api/leads/:id/editform`). */
data class EditField(
    val type: String,
    val name: String?,
    val label: String?,
    val hint: String?,
    val placeholder: String?,
    val value: Any?,
    val options: List<Pair<String, String>>,
    val rows: Int,
    val text: String?,
) {
    companion object {
        fun from(j: JSONObject) = EditField(
            type = j.optString("type"),
            name = j.str("name"),
            label = j.str("label"),
            hint = j.str("hint"),
            placeholder = j.str("placeholder"),
            value = if (j.isNull("value")) null else j.opt("value"),
            options = j.optJSONArray("options").objects().map { it.optString("value") to it.optString("label") },
            rows = j.optInt("rows", 3),
            text = j.str("text"),
        )
    }
}

data class GalleryItem(val key: String, val src: String, val alt: String)

data class EditCard(val id: String, val title: String, val kind: String?, val hero: String?, val gallery: List<GalleryItem>, val hasSpanish: Boolean, val collapsed: Boolean, val fields: List<EditField>) {
    companion object {
        fun from(j: JSONObject) = EditCard(
            id = j.optString("id"),
            title = j.optString("title"),
            kind = j.str("kind"),
            hero = j.str("hero"),
            gallery = j.optJSONArray("gallery").objects().map { GalleryItem(it.optString("key"), it.optString("src"), it.optString("alt")) },
            hasSpanish = j.optBoolean("hasSpanish"),
            collapsed = j.optBoolean("collapsed"),
            fields = j.optJSONArray("fields").objects().map { EditField.from(it) },
        )
    }
}

suspend fun Api.editForm(leadId: String): Pair<String, List<EditCard>> {
    val j = getJson("/leads/$leadId/editform")
    return j.optString("name") to j.optJSONArray("cards").objects().map { EditCard.from(it) }
}

suspend fun Api.saveEditForm(leadId: String, values: Map<String, Any>): List<String> {
    val body = JSONObject()
    val v = JSONObject()
    values.forEach { (k, x) -> v.put(k, x) }
    body.put("values", v)
    val r = putJson("/leads/$leadId/editform", body)
    val w = r.optJSONArray("warnings")
    return (0 until (w?.length() ?: 0)).map { w!!.optString(it) }
}

/** Reads a picked image, scales it to at most 1600 px on the long side and encodes a JPEG (what the web editor does). */
suspend fun resizeImage(context: Context, uri: Uri): Triple<ByteArray, Int, Int> = withContext(Dispatchers.IO) {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    context.contentResolver.openInputStream(uri)!!.use { BitmapFactory.decodeStream(it, null, bounds) }
    var sample = 1
    while (maxOf(bounds.outWidth, bounds.outHeight) / sample > 3200) sample *= 2
    val raw = context.contentResolver.openInputStream(uri)!!.use { BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = sample }) }
        ?: throw IllegalStateException("Couldn't read that photo")
    val scale = minOf(1f, 1600f / maxOf(raw.width, raw.height))
    val bmp = if (scale < 1f) Bitmap.createScaledBitmap(raw, (raw.width * scale).toInt(), (raw.height * scale).toInt(), true) else raw
    val out = ByteArrayOutputStream()
    bmp.compress(Bitmap.CompressFormat.JPEG, 82, out)
    Triple(out.toByteArray(), bmp.width, bmp.height)
}

/** The site editor: every card and field the Worker describes for this business, saved as one set of edits. */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun EditScreen(state: AppState, nav: NavHostController, id: String) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var name by remember { mutableStateOf("") }
    var cards by remember { mutableStateOf<List<EditCard>>(emptyList()) }
    val values = remember { mutableStateMapOf<String, Any>() }
    val open = remember { mutableStateMapOf<String, Boolean>() }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var dirty by remember { mutableStateOf(false) }
    var saving by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf<String?>(null) }
    var askLeave by remember { mutableStateOf(false) }
    var photoAlt by remember { mutableStateOf("") }
    var galleryAlt by remember { mutableStateOf("") }

    suspend fun load(keepTyped: Boolean) {
        try {
            val (n, cs) = state.api.editForm(id)
            name = n
            cards = cs
            for (c in cs) for (f in c.fields) {
                val k = f.name ?: continue
                if (!keepTyped || !values.containsKey(k)) values[k] = f.value ?: (if (f.type == "check") false else "")
            }
            for (c in cs) if (!open.containsKey(c.id)) open[c.id] = !c.collapsed
            error = null
        } catch (e: Api.Unauthorized) { state.signOut() } catch (e: Exception) { error = e.message }
        loading = false
    }
    LaunchedEffect(id) { load(false) }

    val photoPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        scope.launch {
            busy = "Uploading photo…"
            try {
                val (jpeg, w, h) = resizeImage(context, uri)
                state.api.uploadPhoto(id, "photo", jpeg, w, h, photoAlt.ifBlank { name })
                context.toast("Photo saved")
                load(true)
            } catch (e: Exception) { context.toast(e.message ?: "Upload failed") } finally { busy = null }
        }
    }
    val galleryPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetMultipleContents()) { uris ->
        if (uris.isEmpty()) return@rememberLauncherForActivityResult
        scope.launch {
            try {
                uris.forEachIndexed { i, uri ->
                    busy = "Uploading ${i + 1} of ${uris.size}…"
                    val (jpeg, w, h) = resizeImage(context, uri)
                    state.api.uploadPhoto(id, "gallery", jpeg, w, h, galleryAlt.ifBlank { "Photo of $name" })
                }
                context.toast(if (uris.size == 1) "Photo added" else "${uris.size} photos added")
                load(true)
            } catch (e: Exception) { context.toast(e.message ?: "Upload failed") } finally { busy = null }
        }
    }

    fun act(label: String, block: suspend () -> Unit) {
        scope.launch {
            busy = label
            try { block(); load(true) } catch (e: Exception) { context.toast(e.message ?: "That didn't work") } finally { busy = null }
        }
    }

    fun save() {
        saving = true
        scope.launch {
            try {
                val warnings = state.api.saveEditForm(id, values.toMap())
                dirty = false
                context.toast(if (warnings.isEmpty()) "Saved. Preview updated." else warnings.joinToString("\n"))
                nav.popBackStack()
            } catch (e: Exception) { context.toast(e.message ?: "Couldn't save") } finally { saving = false }
        }
    }

    BackHandler { if (dirty) askLeave = true else nav.popBackStack() }
    if (askLeave) AlertDialog(
        onDismissRequest = { askLeave = false },
        title = { Text("Leave without saving?") },
        text = { Text("Your changes to the text and facts aren't saved yet.") },
        confirmButton = { TextButton(onClick = { askLeave = false; nav.popBackStack() }) { Text("Leave") } },
        dismissButton = { TextButton(onClick = { askLeave = false }) { Text("Keep editing") } },
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (name.isBlank()) "Edit" else "Edit $name", maxLines = 1) },
                navigationIcon = { IconButton(onClick = { if (dirty) askLeave = true else nav.popBackStack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
                actions = { Button(onClick = { save() }, enabled = !saving && !loading, modifier = Modifier.padding(end = 8.dp)) { Text(if (saving) "Saving…" else "Save") } },
            )
        },
    ) { pad ->
        if (loading) { Box(Modifier.fillMaxSize().padding(pad), contentAlignment = Alignment.Center) { CircularProgressIndicator() }; return@Scaffold }
        error?.let { e -> Column(Modifier.padding(pad).padding(24.dp)) { Text(e, color = MaterialTheme.colorScheme.error); Button(onClick = { scope.launch { loading = true; load(false) } }, modifier = Modifier.padding(top = 8.dp)) { Text("Try again") } }; return@Scaffold }
        LazyColumn(Modifier.fillMaxSize().padding(pad), contentPadding = PaddingValues(12.dp, 8.dp, 12.dp, 40.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            busy?.let { b -> item { Row(verticalAlignment = Alignment.CenterVertically) { CircularProgressIndicator(Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)); Text(b) } } }
            cards.forEach { card ->
                item(key = card.id) {
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(14.dp)) {
                            val isOpen = open[card.id] ?: true
                            Row(Modifier.fillMaxWidth().clickable { open[card.id] = !isOpen }, verticalAlignment = Alignment.CenterVertically) {
                                Text(card.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                                Icon(if (isOpen) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown, null)
                            }
                            if (!isOpen) return@Column
                            when (card.kind) {
                                "photo" -> {
                                    card.fields.forEach { f -> FieldView(f, values) { dirty = true } }
                                    OutlinedTextField(photoAlt, { photoAlt = it }, label = { Text("Describe the photo") }, placeholder = { Text("e.g. Freshly mowed front lawn in Cullman") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                                    OutlinedButton(onClick = { photoPicker.launch("image/*") }, enabled = busy == null, modifier = Modifier.padding(top = 6.dp)) { Text(if (card.hero == "owner") "Replace main photo" else "Upload main photo") }
                                }
                                "gallery" -> {
                                    val notes = card.fields.filter { it.type == "note" }
                                    notes.forEach { FieldView(it, values) {} }
                                    card.gallery.forEach { g ->
                                        Row(Modifier.fillMaxWidth().padding(top = 10.dp), verticalAlignment = Alignment.Top) {
                                            AuthImage(state.api, "/p/$id${g.src}", Modifier.size(88.dp), maxPx = 200)
                                            Spacer(Modifier.width(10.dp))
                                            Column(Modifier.weight(1f)) {
                                                card.fields.filter { it.name == "gcap_${g.key}" || it.name == "gtown_${g.key}" || it.name == "gpair_${g.key}" }.forEach { f -> FieldView(f, values) { dirty = true } }
                                                TextButton(onClick = { act("Removing photo…") { state.api.deleteJson("/leads/$id/gallery/${g.key}") } }) { Text("Remove") }
                                            }
                                        }
                                    }
                                    OutlinedTextField(galleryAlt, { galleryAlt = it }, label = { Text("Describe them (used for every photo in this batch)") }, placeholder = { Text("e.g. Fresh fade at the shop") }, singleLine = true, modifier = Modifier.fillMaxWidth().padding(top = 8.dp))
                                    OutlinedButton(onClick = { galleryPicker.launch("image/*") }, enabled = busy == null, modifier = Modifier.padding(top = 6.dp)) { Text("Add photos") }
                                }
                                "spanish" -> {
                                    card.fields.forEach { FieldView(it, values) {} }
                                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        OutlinedButton(onClick = { act("Writing the Spanish page (about 20 seconds)…") { state.api.postJson("/leads/$id/spanish") } }, enabled = busy == null) { Text(if (card.hasSpanish) "Rewrite Spanish page" else "Write Spanish page") }
                                        if (card.hasSpanish) {
                                            OutlinedButton(onClick = { nav.navigate("preview/$id?path=es") }) { Text("See it") }
                                            TextButton(onClick = { act("Removing…") { state.api.deleteJson("/leads/$id/spanish") } }, enabled = busy == null) { Text("Remove") }
                                        }
                                    }
                                }
                                "design" -> {
                                    card.fields.forEach { f -> FieldView(f, values) { dirty = true } }
                                    OutlinedButton(onClick = { act("Rolling a new structure…") { state.api.postJson("/leads/$id/restyle", JSONObject().put("structureOnly", true)); for (k in values.keys.filter { it.startsWith("dna_") || it == "lookBase" || it == "layout" }) values.remove(k) } }, enabled = busy == null, modifier = Modifier.padding(top = 6.dp)) { Text("🎲 Surprise me") }
                                }
                                else -> card.fields.forEach { f -> FieldView(f, values) { dirty = true } }
                            }
                        }
                    }
                }
            }
            item {
                Button(onClick = { save() }, enabled = !saving, modifier = Modifier.fillMaxWidth().height(52.dp)) { Text(if (saving) "Saving…" else "Save & update preview") }
                OutlinedButton(onClick = { nav.navigate("preview/$id") }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) { Text("Preview") }
            }
        }
    }
}

/** One form field, bound to the shared values map. */
@Composable
private fun FieldView(f: EditField, values: MutableMap<String, Any>, onChange: () -> Unit) {
    val name = f.name
    when (f.type) {
        "heading" -> Text(f.text ?: "", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 10.dp, bottom = 2.dp))
        "note" -> Text(f.text ?: "", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(vertical = 4.dp))
        "hidden" -> {}
        "check" -> {
            val checked = (values[name] as? Boolean) ?: false
            Row(Modifier.fillMaxWidth().clickable { values[name!!] = !checked; onChange() }, verticalAlignment = Alignment.CenterVertically) {
                Checkbox(checked = checked, onCheckedChange = { values[name!!] = it; onChange() })
                Text(f.label ?: "", modifier = Modifier.weight(1f))
            }
        }
        "select" -> {
            val current = values[name]?.toString() ?: ""
            if (f.options.size <= 4) {
                Text(f.label ?: "", style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(top = 6.dp))
                @OptIn(ExperimentalLayoutApi::class)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    f.options.forEach { (v, l) -> FilterChip(selected = current == v, onClick = { values[name!!] = v; onChange() }, label = { Text(l) }) }
                }
            } else {
                var expanded by remember { mutableStateOf(false) }
                val label = f.options.firstOrNull { it.first == current }?.second ?: current
                Box(Modifier.fillMaxWidth().padding(top = 6.dp)) {
                    OutlinedButton(onClick = { expanded = true }, modifier = Modifier.fillMaxWidth()) { Text("${f.label ?: ""}: ${label.ifBlank { "—" }}", maxLines = 1) }
                    DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                        f.options.forEach { (v, l) -> DropdownMenuItem(text = { Text(l) }, onClick = { values[name!!] = v; onChange(); expanded = false }) }
                    }
                }
            }
        }
        else -> {
            val text = values[name]?.toString() ?: ""
            val multi = f.type == "textarea"
            val kb = when (f.type) {
                "number" -> KeyboardType.Number
                "tel" -> KeyboardType.Phone
                "email" -> KeyboardType.Email
                "url" -> KeyboardType.Uri
                else -> KeyboardType.Text
            }
            OutlinedTextField(
                value = text,
                onValueChange = { values[name!!] = it; onChange() },
                label = { Text(f.label ?: "") },
                placeholder = f.placeholder?.let { p -> { Text(p) } },
                supportingText = f.hint?.let { h -> { Text(h) } },
                singleLine = !multi,
                minLines = if (multi) maxOf(2, f.rows) else 1,
                keyboardOptions = KeyboardOptions(keyboardType = kb),
                modifier = Modifier.fillMaxWidth().padding(top = 6.dp),
            )
        }
    }
}
