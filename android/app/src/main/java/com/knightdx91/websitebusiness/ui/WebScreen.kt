package com.knightdx91.websitebusiness.ui

import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Environment
import android.webkit.CookieManager
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.navigation.NavHostController
import com.knightdx91.websitebusiness.AppState

/**
 * The web app's long-tail screens (site editor, preview, inbox, sales, full settings, sign-up and agreement pages) inside
 * the app, signed in with the same session (the token becomes the wb_session cookie for our origin only). Phone calls,
 * texts, maps, Stripe, PDFs and the Tap to Pay intent:// link all hand off to the right app.
 */
@SuppressLint("SetJavaScriptEnabled")
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WebScreen(state: AppState, nav: NavHostController, path: String) {
    val context = LocalContext.current
    val origin = state.api.origin
    val url = if (path.startsWith("http")) path else origin + path
    var webView by remember { mutableStateOf<WebView?>(null) }
    var title by remember { mutableStateOf("") }
    var fileCallback by remember { mutableStateOf<ValueCallback<Array<Uri>>?>(null) }
    val filePicker = rememberLauncherForActivityResult(ActivityResultContracts.GetMultipleContents()) { uris ->
        fileCallback?.onReceiveValue(uris.toTypedArray())
        fileCallback = null
    }

    BackHandler { if (webView?.canGoBack() == true) webView?.goBack() else nav.popBackStack() }

    Scaffold(topBar = {
        TopAppBar(
            title = { Text(title.ifBlank { "Website Business" }, maxLines = 1) },
            navigationIcon = { IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
            actions = { IconButton(onClick = { webView?.reload() }) { Icon(Icons.Default.Refresh, "Reload") } },
        )
    }) { pad ->
        AndroidView(
            modifier = Modifier.fillMaxSize().padding(pad),
            factory = { ctx ->
                WebView(ctx).apply {
                    settings.javaScriptEnabled = true
                    settings.domStorageEnabled = true
                    settings.loadWithOverviewMode = true
                    settings.useWideViewPort = true
                    settings.mediaPlaybackRequiresUserGesture = false
                    settings.userAgentString = settings.userAgentString + " WebsiteBusinessApp/" + com.knightdx91.websitebusiness.BuildConfig.VERSION_NAME
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
                                s.startsWith("intent://") -> {
                                    runCatching { ctx.startActivity(Intent.parseUri(s, Intent.URI_INTENT_SCHEME).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); selector = null; component = null }) }
                                        .onFailure { ctx.toast("Update the app to take tap payments") }
                                    true
                                }
                                u.scheme in setOf("tel", "sms", "smsto", "mailto", "geo") -> { runCatching { ctx.startActivity(Intent(Intent.ACTION_VIEW, u)) }; true }
                                s.startsWith(origin) || u.host == "undergroundassociates.com" || u.host == "www.undergroundassociates.com" -> false
                                else -> { ctx.openUrl(s); true }
                            }
                        }

                        override fun onPageFinished(view: WebView, url: String?) {
                            title = view.title ?: ""
                        }
                    }
                    webChromeClient = object : WebChromeClient() {
                        override fun onShowFileChooser(view: WebView, callback: ValueCallback<Array<Uri>>, params: FileChooserParams): Boolean {
                            fileCallback?.onReceiveValue(null)
                            fileCallback = callback
                            val accept = params.acceptTypes.firstOrNull { it.isNotBlank() } ?: "image/*"
                            filePicker.launch(accept)
                            return true
                        }
                    }
                    setDownloadListener { dUrl, _, contentDisposition, mimeType, _ ->
                        try {
                            val req = DownloadManager.Request(Uri.parse(dUrl))
                            val cookie = CookieManager.getInstance().getCookie(dUrl)
                            if (cookie != null) req.addRequestHeader("Cookie", cookie)
                            val name = Regex("filename=\"?([^\";]+)").find(contentDisposition ?: "")?.groupValues?.get(1) ?: "download"
                            req.setMimeType(mimeType)
                            req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                            req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name)
                            (ctx.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager).enqueue(req)
                            ctx.toast("Downloading $name")
                        } catch (e: Exception) { ctx.toast("Couldn't download") }
                    }
                    loadUrl(url)
                    webView = this
                }
            },
        )
    }
}
