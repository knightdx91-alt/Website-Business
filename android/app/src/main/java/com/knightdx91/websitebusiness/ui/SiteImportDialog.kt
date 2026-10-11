package com.knightdx91.websitebusiness.ui

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.os.Handler
import android.os.Looper
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.knightdx91.websitebusiness.net.Api
import com.knightdx91.websitebusiness.net.siteImport
import kotlinx.coroutines.launch
import org.json.JSONObject

/**
 * Reads the business's current website from this phone. The server often can't: small-business hosts are slow, some block
 * data-center addresses, and builder-made pages fill their photos in with scripts. A real browser view here loads the page
 * exactly as a visitor sees it, scrolls so lazy photos load, then hands the page and every photo address to the Worker,
 * which extracts the facts, downloads the photos and rebuilds the text.
 */
private const val COLLECT_JS = """(function(){var imgs=[],seen={};function add(s,a){if(!s||s.indexOf('data:')===0||seen[s])return;seen[s]=1;imgs.push({src:s,alt:a||''});}
document.querySelectorAll('img').forEach(function(i){var big=(i.naturalWidth||i.width||0)>=200;var ss=i.getAttribute('srcset')||i.getAttribute('data-srcset');if(ss){var best=ss.split(',').map(function(x){return x.trim().split(/\s+/)}).sort(function(a,b){return (parseInt(b[1])||0)-(parseInt(a[1])||0)})[0];if(best&&best[0]&&big)add(best[0],i.alt);}var s=i.currentSrc||i.src||i.getAttribute('data-src');if(s&&big)add(s,i.alt);});
document.querySelectorAll('*').forEach(function(el){if(el.offsetWidth<200||el.offsetHeight<120)return;var bg=getComputedStyle(el).backgroundImage;var m=bg&&/url\(["']?([^"')]+)["']?\)/.exec(bg);if(m)add(m[1],el.getAttribute('aria-label')||el.getAttribute('title')||'');});
return JSON.stringify({url:location.href,html:document.documentElement.outerHTML.slice(0,2500000),images:imgs.slice(0,80)});})()"""

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun SiteImportDialog(api: Api, leadId: String, url: String, onDone: (changed: Boolean) -> Unit) {
    val scope = rememberCoroutineScope()
    var stage by remember { mutableStateOf("Opening their website…") }
    var busy by remember { mutableStateOf(true) }
    var result by remember { mutableStateOf<String?>(null) }
    var failed by remember { mutableStateOf(false) }
    val handler = remember { Handler(Looper.getMainLooper()) }
    // Google often stores the plain http address. Try https first; fall back to the address as given if that fails.
    val secure = if (url.startsWith("http://")) url.replaceFirst("http://", "https://") else url
    var triedFallback by remember { mutableStateOf(secure == url) }

    fun collect(web: WebView) {
        stage = "Reading the page…"
        web.evaluateJavascript(COLLECT_JS) { raw ->
            scope.launch {
                try {
                    // evaluateJavascript hands back a JSON string literal; unwrap it.
                    val json = JSONObject(org.json.JSONTokener(raw).nextValue().toString())
                    stage = "Saving what we found…"
                    val r = api.siteImport(leadId, json.optString("url", url), json.optString("html"), json.optJSONArray("images"))
                    val bits = listOfNotNull(
                        "${r.optInt("paragraphs")} paragraphs of text",
                        "${r.optInt("photos")} photos saved".takeIf { r.optInt("photos") > 0 } ?: "no usable photos",
                        r.optString("email").takeIf { it.isNotBlank() && it != "null" }?.let { "email $it" },
                        r.optInt("foundedYear").takeIf { it > 0 }?.let { "since $it" },
                    )
                    val notices = r.optJSONArray("notices")
                    result = "Read ${bits.joinToString(", ")}. The text is being rewritten with these facts now (about a minute)." +
                        (if (notices != null && notices.length() > 0) "\n\nNotice on their site: ${notices.optString(0)}" else "")
                } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) {
                    failed = true
                    result = e.message ?: "Couldn't save what we read"
                } finally {
                    busy = false
                }
            }
        }
    }

    AlertDialog(
        onDismissRequest = { if (!busy) onDone(result != null && !failed) },
        title = { Text("Import their website") },
        text = {
            Column {
                Text(if (result == null) stage else result!!, style = MaterialTheme.typography.bodyMedium)
                if (busy) LinearProgressIndicator(Modifier.fillMaxWidth().padding(top = 10.dp))
                if (result == null) AndroidView(
                    modifier = Modifier.fillMaxWidth().height(220.dp).padding(top = 12.dp),
                    factory = { ctx ->
                        WebView(ctx).apply {
                            settings.javaScriptEnabled = true
                            settings.domStorageEnabled = true
                            settings.loadWithOverviewMode = true
                            settings.useWideViewPort = true
                            webViewClient = object : WebViewClient() {
                                private var done = false
                                override fun onPageStarted(view: WebView, url: String?, favicon: Bitmap?) { stage = "Loading ${runCatching { java.net.URI(url ?: "").host }.getOrNull() ?: "their site"}…" }
                                override fun onPageFinished(view: WebView, url: String?) {
                                    if (done) return
                                    done = true
                                    stage = "Loaded. Scrolling so every photo appears…"
                                    // Lazy photos load as they come into view: walk the page, then settle, then read it.
                                    val steps = listOf(0.2, 0.4, 0.6, 0.8, 1.0, 0.0)
                                    steps.forEachIndexed { i, k -> handler.postDelayed({ view.evaluateJavascript("window.scrollTo(0, document.body.scrollHeight * $k)", null) }, 500L * (i + 1)) }
                                    handler.postDelayed({ collect(view) }, 500L * steps.size + 2_500L)
                                }
                                override fun onReceivedError(view: WebView, request: android.webkit.WebResourceRequest, error: android.webkit.WebResourceError) {
                                    if (!request.isForMainFrame || done) return
                                    if (!triedFallback) {
                                        triedFallback = true
                                        stage = "Secure address didn't answer; trying the plain one…"
                                        handler.post { view.loadUrl(url) }
                                        return
                                    }
                                    done = true; failed = true; busy = false
                                    result = "Their site didn't load on this phone either: ${error.description}"
                                }
                            }
                            loadUrl(secure)
                        }
                    },
                )
            }
        },
        confirmButton = { TextButton(onClick = { onDone(result != null && !failed) }, enabled = !busy) { Text(if (failed) "Close" else "Done") } },
    )
}
