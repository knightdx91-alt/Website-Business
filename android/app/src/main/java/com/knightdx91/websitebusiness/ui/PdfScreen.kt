package com.knightdx91.websitebusiness.ui

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.pdf.PdfRenderer
import android.os.Bundle
import android.os.CancellationSignal
import android.os.ParcelFileDescriptor
import android.print.PageRange
import android.print.PrintAttributes
import android.print.PrintDocumentAdapter
import android.print.PrintDocumentInfo
import android.print.PrintManager
import androidx.compose.foundation.Image
import androidx.compose.foundation.gestures.rememberTransformableState
import androidx.compose.foundation.gestures.transformable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import androidx.navigation.NavHostController
import com.knightdx91.websitebusiness.AppState
import com.knightdx91.websitebusiness.BuildConfig
import com.knightdx91.websitebusiness.net.Api
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream

/*
 * A PDF behind the login (signed agreements, the agreement preview, the payment authorization form, review cards),
 * fetched with the session, rendered page by page with the platform PdfRenderer, with Print and Share in the top bar.
 * Route: pdf?path={path}&title={title}, e.g. nav.navigate("pdf?path=" + Uri.encode("/api/agreements/s/<id>.pdf") +
 * "&title=" + Uri.encode("Signed agreement")).
 */

/** Pages are rendered this wide at most (pixels); wider costs memory, and pinch-zoom scales the bitmap up to 3×. */
private const val MAX_RENDER_PX = 1100

/** How many pages either side of the first visible one keep their bitmaps. */
private const val KEEP_PAGES = 3

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PdfScreen(state: AppState, nav: NavHostController, path: String, title: String?) {
    val context = LocalContext.current
    val heading = title?.takeIf { it.isNotBlank() } ?: "PDF"
    var file by remember(path) { mutableStateOf<File?>(null) }
    var renderer by remember(path) { mutableStateOf<PdfRenderer?>(null) }
    var pageCount by remember(path) { mutableIntStateOf(0) }
    var error by remember(path) { mutableStateOf<String?>(null) }
    val pages = remember(path) { mutableStateMapOf<Int, Bitmap>() }
    val lock = remember { Mutex() }
    var scale by remember { mutableFloatStateOf(1f) }
    val listState = rememberLazyListState()

    LaunchedEffect(path) {
        if (path.isBlank()) { error = "Nothing to show"; return@LaunchedEffect }
        try {
            val bytes = state.api.bytes(path)
            val opened = withContext(Dispatchers.IO) {
                val dir = File(context.cacheDir, "pdf").apply { mkdirs() }
                val f = File(dir, pdfFileName(path, title)).also { it.writeBytes(bytes) }
                f to PdfRenderer(ParcelFileDescriptor.open(f, ParcelFileDescriptor.MODE_READ_ONLY))
            }
            file = opened.first
            renderer = opened.second
            pageCount = opened.second.pageCount
        } catch (e: Api.Unauthorized) {
            state.signOut()
        } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) {
            error = e.message ?: "Couldn't load the PDF"
        }
    }
    DisposableEffect(renderer) {
        val r = renderer
        onDispose { runCatching { r?.close() } }
    }
    // Keep only the pages near the one on screen; the rest render again when scrolled back to.
    LaunchedEffect(listState.firstVisibleItemIndex) {
        val first = listState.firstVisibleItemIndex
        pages.keys.filter { it < first - KEEP_PAGES || it > first + KEEP_PAGES }.forEach { pages.remove(it) }
    }

    fun share() {
        val f = file ?: return
        runCatching {
            val uri = FileProvider.getUriForFile(context, "${BuildConfig.APPLICATION_ID}.files", f)
            val send = Intent(Intent.ACTION_SEND).setType("application/pdf").putExtra(Intent.EXTRA_STREAM, uri).putExtra(Intent.EXTRA_SUBJECT, heading).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            context.startActivity(Intent.createChooser(send, heading).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        }.onFailure { context.toast("Couldn't share the PDF") }
    }

    fun printPdf() {
        val f = file ?: return
        runCatching {
            val pm = context.getSystemService(Context.PRINT_SERVICE) as PrintManager
            pm.print(heading, PdfPrintAdapter(f, heading, pageCount), null)
        }.onFailure { context.toast("Couldn't open the print dialog") }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(heading, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                navigationIcon = { IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
                actions = {
                    TextButton(onClick = { printPdf() }, enabled = file != null) { Text("Print") }
                    IconButton(onClick = { share() }, enabled = file != null) { Icon(Icons.Default.Share, "Share") }
                },
            )
        },
    ) { pad ->
        val err = error
        if (err != null) {
            Column(Modifier.fillMaxSize().padding(pad).padding(24.dp)) {
                Text(err, color = MaterialTheme.colorScheme.error)
                TextButton(onClick = { nav.popBackStack() }) { Text("Back") }
            }
            return@Scaffold
        }
        val r = renderer
        if (r == null) {
            Box(Modifier.fillMaxSize().padding(pad), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            return@Scaffold
        }
        BoxWithConstraints(Modifier.fillMaxSize().padding(pad)) {
            val screenWidth = maxWidth
            val renderPx = with(LocalDensity.current) { (screenWidth - 24.dp).toPx() }.toInt().coerceIn(200, MAX_RENDER_PX)
            val zoom = rememberTransformableState { zoomChange, _, _ -> scale = (scale * zoomChange).coerceIn(1f, 3f) }
            Box(Modifier.fillMaxSize().transformable(zoom).horizontalScroll(rememberScrollState())) {
                LazyColumn(
                    Modifier.width(screenWidth * scale).fillMaxHeight(),
                    state = listState,
                    contentPadding = PaddingValues(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    items(pageCount, key = { it }) { i ->
                        val bmp = pages[i]
                        LaunchedEffect(i, r) {
                            if (pages[i] == null) {
                                val b = withContext(Dispatchers.IO) { lock.withLock { renderPage(r, i, renderPx) } }
                                if (b != null) pages[i] = b
                            }
                        }
                        Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                            if (bmp != null) {
                                Image(bmp.asImageBitmap(), contentDescription = "Page ${i + 1}", modifier = Modifier.fillMaxWidth().aspectRatio(bmp.width.toFloat() / bmp.height), contentScale = ContentScale.FillWidth)
                            } else {
                                Box(Modifier.fillMaxWidth().aspectRatio(8.5f / 11f), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                            }
                        }
                    }
                    item {
                        Text(
                            if (pageCount == 1) "1 page" else "$pageCount pages",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(bottom = 16.dp),
                        )
                    }
                }
            }
        }
    }
}

/** The cache file name: the title when there is one, else the last part of the path, letters and digits only. */
private fun pdfFileName(path: String, title: String?): String {
    val base = title?.takeIf { it.isNotBlank() } ?: path.substringBefore("?").substringAfterLast("/").removeSuffix(".pdf").ifBlank { "document" }
    val safe = base.replace(Regex("[^A-Za-z0-9]+"), "-").trim('-').ifBlank { "document" }
    return "$safe.pdf"
}

/** One page as a white ARGB bitmap `widthPx` wide. PdfRenderer renders onto what is there, so the bitmap is cleared to white first. */
private fun renderPage(r: PdfRenderer, index: Int, widthPx: Int): Bitmap? = runCatching {
    val page = r.openPage(index)
    try {
        val w = widthPx.coerceAtLeast(200)
        val h = (w.toLong() * page.height / page.width.coerceAtLeast(1)).toInt().coerceAtLeast(1)
        val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        bmp.eraseColor(android.graphics.Color.WHITE)
        page.render(bmp, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
        bmp
    } finally {
        page.close()
    }
}.getOrNull()

/** Hands the PDF file to Android's print framework as-is (it is already a document, no re-layout needed). */
private class PdfPrintAdapter(private val file: File, private val name: String, private val pageCount: Int) : PrintDocumentAdapter() {
    override fun onLayout(oldAttributes: PrintAttributes?, newAttributes: PrintAttributes?, cancellationSignal: CancellationSignal?, callback: PrintDocumentAdapter.LayoutResultCallback?, extras: Bundle?) {
        if (cancellationSignal?.isCanceled == true) {
            callback?.onLayoutCancelled()
            return
        }
        val info = PrintDocumentInfo.Builder(name.replace(Regex("[^A-Za-z0-9 ._-]+"), " ").trim().ifBlank { "document" } + ".pdf")
            .setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT)
            .setPageCount(if (pageCount > 0) pageCount else PrintDocumentInfo.PAGE_COUNT_UNKNOWN)
            .build()
        callback?.onLayoutFinished(info, true)
    }

    override fun onWrite(pages: Array<out PageRange>?, destination: ParcelFileDescriptor?, cancellationSignal: CancellationSignal?, callback: PrintDocumentAdapter.WriteResultCallback?) {
        if (destination == null) {
            callback?.onWriteFailed("No destination")
            return
        }
        try {
            FileInputStream(file).use { input -> FileOutputStream(destination.fileDescriptor).use { output -> input.copyTo(output) } }
            if (cancellationSignal?.isCanceled == true) callback?.onWriteCancelled() else callback?.onWriteFinished(arrayOf(PageRange.ALL_PAGES))
        } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) {
            callback?.onWriteFailed(e.message)
        }
    }
}
