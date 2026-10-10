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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
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

    BackHandler { if (webView?.canGoBack() == true) webView?.goBack() else nav.popBackStack() }

    fun share(copy: Boolean) {
        scope.launch {
            try {
                val link = state.api.shareLink(id)
                runCatching { state.api.logCall(id, "link_sent", if (copy) "Copied the preview link" else "Texted the preview link", null) }
                val detail = runCatching { state.api.lead(id) }.getOrNull()
                val name = detail?.lead?.name ?: "your business"
                val me = state.meta?.let { m -> if (m.isOwner) m.callerName.ifBlank { m.meName } else m.meName } ?: ""
                val co = state.meta?.companyName?.ifBlank { null }
                val msg = "Hi, this is ${me.ifBlank { "me" }}${if (co != null) " with $co" else ""}. Here's the free website preview I made for $name: $link"
                if (copy) {
                    (context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager).setPrimaryClip(ClipData.newPlainText("Preview link", msg))
                    context.toast("Message with the preview link copied")
                } else context.sms(detail?.lead?.phone, msg)
            } catch (e: Exception) { context.toast(e.message ?: "Couldn't make the link") }
        }
    }

    Scaffold(topBar = {
        Column {
            TopAppBar(
                title = { Text("Preview", maxLines = 1) },
                navigationIcon = { IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
            )
            Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 8.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                FilterChip(selected = !desktop, onClick = { desktop = false; webView?.let { w -> w.settings.userAgentString = mobileUa; w.settings.useWideViewPort = false; w.settings.loadWithOverviewMode = false; w.reload() } }, label = { Text("📱 Phone") })
                FilterChip(selected = desktop, onClick = { desktop = true; webView?.let { w -> w.settings.userAgentString = DESKTOP_UA; w.settings.useWideViewPort = true; w.settings.loadWithOverviewMode = true; w.reload() } }, label = { Text("🖥️ Desktop") })
                OutlinedButton(onClick = { share(false) }) { Text("💬 Text link") }
                OutlinedButton(onClick = { share(true) }) { Text("🔗 Copy") }
                if (state.meta?.isOwner == true) OutlinedButton(onClick = { nav.navigate("edit/$id") }) { Text("✏️ Edit") }
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
