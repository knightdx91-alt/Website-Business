package com.knightdx91.websitebusiness.ui

import android.annotation.SuppressLint
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.webkit.CookieManager
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import com.knightdx91.websitebusiness.net.leadFull
import com.knightdx91.websitebusiness.net.sampleStock
import kotlinx.coroutines.delay
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.navigation.NavHostController
import com.knightdx91.websitebusiness.AppState
import kotlinx.coroutines.launch

private const val DESKTOP_UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"

/**
 * The private preview of a lead's site, shown to the business owner on the phone: phone / desktop toggle, text or copy the
 * 14-day share link, open in Chrome, and Edit for the owner. The site itself is a web page, so this is a WebView with the
 * session cookie; everything around it is native.
 */
@SuppressLint("SetJavaScriptEnabled")
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PreviewScreen(state: AppState, nav: NavHostController, id: String, path: String?) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val origin = state.api.origin
    val url = "$origin/p/$id/${path?.trim('/')?.let { if (it.isEmpty()) "" else "$it/" } ?: ""}"
    var webView by remember { mutableStateOf<WebView?>(null) }
    var desktop by remember { mutableStateOf(false) }
    var mobileUa by remember { mutableStateOf("") }
    // Sample stock on the price list (owner): null until the lead is read, or when the site is live.
    var sample by remember { mutableStateOf<Boolean?>(null) }
    var spanish by remember { mutableStateOf(false) }
    var sampleBusy by remember { mutableStateOf(false) }
    // Our to-do notes ("Add your hours", "Send photos") are hidden on every preview so the owner sees a finished site.
    var notes by remember { mutableStateOf(false) }
    // ↕ Adjust the top photo: words / photo / tint, moved live in the WebView while dragging, then saved.
    var adjOpen by remember { mutableStateOf(false) }
    var adjMove by remember { mutableStateOf(0f) }
    var adjShift by remember { mutableStateOf(0f) }
    var adjShade by remember { mutableStateOf(100f) }
    var adjSaved by remember { mutableStateOf<Triple<Float, Float, Float>?>(null) }
    var adjBusy by remember { mutableStateOf(false) }
    fun applyAdj() {
        val js = "(function(){var h=document.documentElement;h.setAttribute('data-hadj','');h.style.setProperty('--hmove','${adjMove.toInt()}px');h.style.setProperty('--hshift','${adjShift.toInt()}%');h.style.setProperty('--hshade','${adjShade.toInt() / 100.0}');" +
            (if (adjShift > 0) "h.setAttribute('data-hshift','down');" else "h.removeAttribute('data-hshift');") +
            (if (adjShade < 100) "h.setAttribute('data-hshade','1');" else "h.removeAttribute('data-hshade');") + "})()"
        webView?.evaluateJavascript(js, null)
    }
    LaunchedEffect(id) {
        if (state.meta != null) runCatching { state.api.leadFull(id) }.getOrNull()?.let { d -> if (d.lead.salesStatus != "live") sample = d.sampleStock; spanish = d.hasSpanish }
        if (state.meta != null) runCatching { state.api.getJson("/leads/$id").optJSONObject("heroAdjust") }.getOrNull()?.let { a ->
            adjMove = a.optDouble("move", 0.0).toFloat(); adjShift = a.optDouble("shift", 0.0).toFloat(); adjShade = a.optDouble("shade", 100.0).toFloat()
            adjSaved = Triple(adjMove, adjShift, adjShade)
        }
    }

    BackHandler { if (webView?.canGoBack() == true) webView?.goBack() else nav.popBackStack() }

    fun share(copy: Boolean, es: Boolean = false) {
        scope.launch {
            try {
                val link = state.api.shareLink(id, if (es) "es" else null)
                runCatching { state.api.logCall(id, "link_sent", (if (copy) "Copied the " else "Texted the ") + (if (es) "Spanish link" else "preview link"), null) }
                val detail = runCatching { state.api.lead(id) }.getOrNull()
                val name = detail?.lead?.name ?: "your business"
                val me = state.meta?.let { m -> m.senderName } ?: ""
                val co = state.meta?.companyName?.ifBlank { null }
                val msg = if (es) "¡Hola! Aquí está la vista previa gratis del sitio web que hice para $name: $link" else "Hi, this is ${me.ifBlank { "me" }}${if (co != null) " with $co" else ""}. Here's the free website preview I made for $name: $link"
                if (copy) {
                    (context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager).setPrimaryClip(ClipData.newPlainText("Preview link", msg))
                    context.toast("Message with the preview link copied")
                } else context.sms(detail?.lead?.phone, msg)
            } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { context.toast(e.message ?: "Couldn't make the link") }
        }
    }

    Scaffold(topBar = {
        Column {
            TopAppBar(
                title = { Text("Preview", maxLines = 1) },
                navigationIcon = { IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
            )
            if (adjOpen) Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp)) {
                Text("Words position: ${adjMove.toInt()}px (left = higher)", style = androidx.compose.material3.MaterialTheme.typography.labelMedium)
                androidx.compose.material3.Slider(value = adjMove, onValueChange = { adjMove = it; applyAdj() }, valueRange = -60f..400f)
                Text("Photo position: ${adjShift.toInt()}% (left = higher)", style = androidx.compose.material3.MaterialTheme.typography.labelMedium)
                androidx.compose.material3.Slider(value = adjShift, onValueChange = { adjShift = it; applyAdj() }, valueRange = -40f..80f)
                Text("Shade on the photo: ${adjShade.toInt()}% (left = lighter)", style = androidx.compose.material3.MaterialTheme.typography.labelMedium)
                androidx.compose.material3.Slider(value = adjShade, onValueChange = { adjShade = it; applyAdj() }, valueRange = 10f..100f)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    androidx.compose.material3.Button(enabled = !adjBusy, onClick = {
                        adjBusy = true
                        scope.launch {
                            try {
                                state.api.putJson("/leads/$id/edits", org.json.JSONObject().put("record", org.json.JSONObject().put("heroAdjust", org.json.JSONObject().put("move", adjMove.toInt()).put("shift", adjShift.toInt()).put("shade", adjShade.toInt()))))
                                adjSaved = Triple(adjMove, adjShift, adjShade)
                                context.toast("Saved. The preview is rebuilding with this position.")
                            } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { context.toast(e.message ?: "Couldn't save") } finally { adjBusy = false }
                        }
                    }) { Text(if (adjBusy) "Saving…" else "Save") }
                    OutlinedButton(onClick = { adjSaved?.let { (m, s, sh) -> adjMove = m; adjShift = s; adjShade = sh; applyAdj() } }) { Text("Undo") }
                    OutlinedButton(onClick = { adjMove = 0f; adjShift = 0f; adjShade = 100f; applyAdj() }) { Text("As designed") }
                }
            }
            Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 8.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                FilterChip(selected = !desktop, onClick = { desktop = false; webView?.let { w -> w.settings.userAgentString = mobileUa; w.settings.useWideViewPort = false; w.settings.loadWithOverviewMode = false; w.reload() } }, label = { Text("📱 Phone") })
                FilterChip(selected = desktop, onClick = { desktop = true; webView?.let { w -> w.settings.userAgentString = DESKTOP_UA; w.settings.useWideViewPort = true; w.settings.loadWithOverviewMode = true; w.reload() } }, label = { Text("🖥️ Desktop") })
                if (state.meta != null) FilterChip(selected = notes, onClick = { notes = !notes; webView?.loadUrl("$url?notes=${if (notes) 1 else 0}") }, label = { Text(if (notes) "📝 Hide notes" else "📝 Show notes") })
                OutlinedButton(onClick = { share(false) }) { Text("💬 Text link") }
                OutlinedButton(onClick = { share(true) }) { Text("🔗 Copy") }
                if (spanish) OutlinedButton(onClick = { share(false, es = true) }) { Text("🇲🇽 Text Spanish link") }
                if (spanish) OutlinedButton(onClick = { scope.launch { runCatching { state.api.shareLink(id, "es") }.onSuccess { context.openUrl(it) }.onFailure { context.toast("Couldn't make the link") } } }) { Text("Spanish in Chrome") }
                if (state.meta != null && adjSaved != null) FilterChip(selected = adjOpen, onClick = { adjOpen = !adjOpen; if (adjOpen) webView?.evaluateJavascript("window.scrollTo(0,0)", null) }, label = { Text("↕ Adjust the top photo") })
                if (state.meta != null) OutlinedButton(onClick = { nav.navigate("edit/$id") }) { Text("✏️ Edit") }
                sample?.let { on ->
                    OutlinedButton(enabled = !sampleBusy, onClick = {
                        sampleBusy = true
                        scope.launch {
                            try {
                                state.api.sampleStock(id, add = !on)
                                context.toast(if (on) "Sample items removed. Rebuilding the preview…" else "Sample items added. Rebuilding the preview…")
                                sample = !on
                                delay(3500)
                                webView?.loadUrl(if (on) url else "${url}prices/")
                            } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { context.toast(e.message ?: "Couldn't change the sample items") } finally { sampleBusy = false }
                        }
                    }) { Text(if (on) "🧪 Remove sample items" else "🧪 Add sample items") }
                }
                OutlinedButton(onClick = { scope.launch { runCatching { state.api.shareLink(id) }.onSuccess { context.openUrl(it) }.onFailure { context.toast("Couldn't make the link") } } }) { Text("Open in Chrome") }
            }
        }
    }) { pad ->
        AndroidView(
            modifier = Modifier.fillMaxSize().padding(pad),
            factory = { ctx ->
                WebView(ctx).apply {
                    settings.javaScriptEnabled = true
                    settings.domStorageEnabled = true
                    mobileUa = settings.userAgentString
                    state.api.prefs.token?.let { token ->
                        val cm = CookieManager.getInstance()
                        cm.setAcceptCookie(true)
                        cm.setCookie(origin, "wb_session=$token; Path=/; Secure; HttpOnly; SameSite=Lax")
                        cm.flush()
                    }
                    webViewClient = object : WebViewClient() {
                        // A reload (notes on / off, sample items) keeps what's on the sliders.
                        override fun onPageFinished(view: WebView, url: String?) { if (adjOpen) applyAdj() }
                        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                            val u = request.url
                            val s = u.toString()
                            return when {
                                u.scheme in setOf("tel", "sms", "smsto", "mailto", "geo") -> { runCatching { ctx.startActivity(Intent(Intent.ACTION_VIEW, u)) }; true }
                                s.startsWith("$origin/p/$id/") -> false
                                else -> { ctx.openUrl(s); true }
                            }
                        }
                    }
                    loadUrl(url)
                    webView = this
                }
            },
        )
    }
}
