package com.knightdx91.websitebusiness.ui

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.knightdx91.websitebusiness.AppState
import com.knightdx91.websitebusiness.net.Api
import com.knightdx91.websitebusiness.net.GbpLead
import com.knightdx91.websitebusiness.net.GbpPostItem
import com.knightdx91.websitebusiness.net.GbpReply
import com.knightdx91.websitebusiness.net.GbpState
import com.knightdx91.websitebusiness.net.gbp
import com.knightdx91.websitebusiness.net.gbpCheck
import com.knightdx91.websitebusiness.net.gbpLead
import com.knightdx91.websitebusiness.net.gbpRemovePost
import com.knightdx91.websitebusiness.net.gbpSetPosted
import com.knightdx91.websitebusiness.net.gbpWriteKit
import com.knightdx91.websitebusiness.net.gbpWritePosts
import com.knightdx91.websitebusiness.net.gbpWriteReply
import com.knightdx91.websitebusiness.net.gbpWriteSocial
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.net.URLEncoder

/** The 11-item tune-up checklist (same keys as the web app's GBP_CHECKS; stored in `leads.gbp_json.checks`). */
private val GBP_CHECKS = listOf(
    "access" to "They added you as a Manager on their Google profile",
    "website" to "Website link points to their new site",
    "phone" to "Phone number is right",
    "hours" to "Hours match the website (and holiday hours are set)",
    "category" to "Main category fits what they do",
    "description" to "Business description added",
    "services" to "Services added",
    "photos" to "At least 5 good photos: logo, outside, inside, their work, the team",
    "attributes" to "Details checked (accessibility, payments, women- or veteran-owned if true)",
    "duplicates" to "No duplicate listing on Google Maps",
    "reviewcards" to "Review cards printed and on the counter",
)

/** "Get listed everywhere" extra: the free directories worth claiming, with the same name, address, phone and hours. */
private val GBP_LISTINGS = listOf(
    Triple("listing_apple", "Apple Maps (Apple Business Connect)", "https://businessconnect.apple.com/"),
    Triple("listing_bing", "Bing Places", "https://www.bingplaces.com/"),
    Triple("listing_yelp", "Yelp for Business", "https://biz.yelp.com/"),
    Triple("listing_facebook", "Facebook page: hours, phone and website filled in", "https://www.facebook.com/"),
    Triple("listing_nextdoor", "Nextdoor business page", "https://business.nextdoor.com/"),
    Triple("listing_bbb", "Better Business Bureau", "https://www.bbb.org/get-listed"),
    Triple("listing_chamber", "Cullman Area Chamber of Commerce directory (if they're members)", "https://www.cullmanchamber.org/"),
)

private fun accessSteps(name: String, email: String): String =
    "Here's how to let us manage your Google listing for $name. It takes a minute and you stay the owner:\n" +
        "1. On your phone or computer, go to business.google.com and sign in.\n" +
        "2. Open $name, tap the 3-dot menu, then Business Profile settings, then People and access.\n" +
        "3. Tap Add, enter $email, choose Manager, and tap Invite.\n" +
        "That's it. We never need your password."

private fun Context.copyText(text: String) {
    runCatching { (getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager).setPrimaryClip(ClipData.newPlainText("Text", text)) }
        .onSuccess { toast("Copied") }
        .onFailure { toast("Couldn't copy") }
}

/**
 * Owner only: Google Business Profile, social and listings tools for a sold/live client (`#/gbp/:id` on the web).
 * Everything is written by Claude, checked for phone numbers / links / superlatives, and pasted by hand into Google.
 */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun GbpScreen(state: AppState, nav: NavHostController, leadId: String) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val meta = state.meta
    val isOwner = meta?.isOwner == true
    var lead by remember { mutableStateOf<GbpLead?>(null) }
    var g by remember { mutableStateOf<GbpState?>(null) }
    var loading by remember { mutableStateOf(true) }
    var loadError by remember { mutableStateOf<String?>(null) }
    var notes by remember { mutableStateOf("") }
    var busyKit by remember { mutableStateOf(false) }
    var busyPosts by remember { mutableStateOf(false) }
    var busySocial by remember { mutableStateOf(false) }
    var busyReply by remember { mutableStateOf(false) }
    var review by remember { mutableStateOf("") }
    var reviewer by remember { mutableStateOf("") }
    var stars by remember { mutableStateOf(5) }
    var reply by remember { mutableStateOf<GbpReply?>(null) }
    var confirmDelete by remember { mutableStateOf<String?>(null) }

    /** "Hi, this is Fox with Underground Associates." */
    fun greeting(): String {
        val me = if (isOwner) (meta?.callerName?.ifBlank { null } ?: meta?.meName ?: "") else (meta?.meName ?: "")
        val co = meta?.companyName?.ifBlank { null }
        return "Hi, this is ${me.ifBlank { "me" }}${if (co != null) " with $co" else ""}."
    }

    LaunchedEffect(leadId, isOwner) {
        if (!isOwner) { loading = false; return@LaunchedEffect }
        loading = true
        try {
            lead = state.api.gbpLead(leadId)
            val st = state.api.gbp(leadId)
            g = st
            notes = st.notes
            loadError = null
        } catch (e: Api.Unauthorized) { state.signOut() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { loadError = e.message ?: "Couldn't load the Google profile tools" } finally { loading = false }
    }

    /** Runs one call that answers with the new state and merges it in (keeps website / gbpEmail from the first GET). */
    fun update(onError: (() -> Unit)? = null, after: (() -> Unit)? = null, call: suspend () -> JSONObject) {
        scope.launch {
            try {
                val res = call()
                g = g?.merged(res) ?: GbpState.from(res)
                after?.invoke()
            } catch (e: Api.Unauthorized) { state.signOut() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { context.toast(e.message ?: "Something went wrong"); onError?.invoke() }
        }
    }

    fun setCheck(key: String, done: Boolean) = update { state.api.gbpCheck(leadId, key, done) }

    Scaffold(topBar = {
        TopAppBar(
            title = { Text("Google profile") },
            navigationIcon = { IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
        )
    }) { pad ->
        LazyColumn(Modifier.fillMaxSize().padding(pad), contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            if (!isOwner) {
                item { Card(Modifier.fillMaxWidth()) { Text("The Google profile tools are for the owner.", Modifier.padding(14.dp), color = MaterialTheme.colorScheme.onSurfaceVariant) } }
                return@LazyColumn
            }
            if (loading) item { LinearProgressIndicator(Modifier.fillMaxWidth()) }
            loadError?.let { err -> item { Card(Modifier.fillMaxWidth()) { Text(err, Modifier.padding(14.dp), color = Warn) } } }
            val l = lead ?: return@LazyColumn
            val st = g ?: return@LazyColumn
            val phone = l.phone
            val name = l.name

            item {
                Column {
                    Text("Google profile: $name", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 6.dp)) {
                        OutlinedButton(onClick = { context.openUrl("https://business.google.com/") }) { Text("Open Google Business Profile") }
                        OutlinedButton(onClick = { context.openUrl("https://www.google.com/search?q=" + URLEncoder.encode("$name ${l.city}".trim(), "UTF-8")) }) { Text("Find them on Google") }
                    }
                    Text("Signed in with your Google account as their manager, you can edit their listing from either place.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            // 1. Get access
            item {
                SectionCard("1. Get access") {
                    val email = st.gbpEmail
                    if (email != null) {
                        Text("Text the owner these steps. They add $email as a Manager; they stay the owner and never share a password.", style = MaterialTheme.typography.bodySmall)
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 6.dp)) {
                            Button(onClick = { context.sms(phone, accessSteps(name, email)) }) { Text("Text them the steps") }
                            OutlinedButton(onClick = { context.copyText(accessSteps(name, email)) }) { Text("Copy steps") }
                        }
                        Text("Google emails you an invite. Open it while signed in to $email and accept.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 8.dp))
                    } else {
                        Text("First add the Google account you'll use for client profiles in Settings.", style = MaterialTheme.typography.bodySmall)
                    }
                }
            }

            // 2. Tune-up
            item {
                val done = GBP_CHECKS.count { st.checked(it.first) }
                SectionCard("2. Tune-up  $done/${GBP_CHECKS.size}") {
                    GBP_CHECKS.forEach { (key, label) ->
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                            Checkbox(checked = st.checked(key), onCheckedChange = { setCheck(key, it) })
                            Text(label, modifier = Modifier.weight(1f))
                        }
                        Column(Modifier.padding(start = 48.dp, bottom = 4.dp)) {
                            when (key) {
                                "website" -> {
                                    val site = st.website
                                    if (site != null) Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(site, style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                                        TextButton(onClick = { context.copyText(site) }) { Text("Copy") }
                                    } else Text("Publish the site first.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                "phone" -> l.phoneDisplay?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
                                "category" -> l.variantLabel?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
                                "description" -> {
                                    val kit = st.kit
                                    if (kit != null) {
                                        Text(kit.description, style = MaterialTheme.typography.bodySmall)
                                        Text(
                                            "${kit.description.length}/750 characters" + (if (kit.problems.isNotEmpty()) " · ⚠️ ${kit.problems.joinToString(", ")}: fix before pasting" else ""),
                                            style = MaterialTheme.typography.bodySmall, color = if (kit.problems.isNotEmpty()) Warn else MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                        TextButton(onClick = { context.copyText(kit.description) }, contentPadding = PaddingValues(0.dp)) { Text("Copy") }
                                    } else {
                                        OutlinedButton(
                                            enabled = !busyKit,
                                            onClick = {
                                                busyKit = true
                                                update(onError = { busyKit = false }, after = { busyKit = false }) { state.api.gbpWriteKit(leadId) }
                                            },
                                        ) { Text(if (busyKit) "Writing… (about 15 seconds)" else "Write description & services with AI") }
                                    }
                                }
                                "services" -> st.kit?.services?.forEach { s ->
                                    Text(s.name, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp))
                                    Text(s.description, style = MaterialTheme.typography.bodySmall)
                                    Row {
                                        TextButton(onClick = { context.copyText(s.name) }, contentPadding = PaddingValues(0.dp)) { Text("Copy name") }
                                        TextButton(onClick = { context.copyText(s.description) }, contentPadding = PaddingValues(horizontal = 12.dp)) { Text("Copy description") }
                                    }
                                }
                                "reviewcards" -> {
                                    if (l.noReviews) Text("Not for financial advisors: no review cards or review requests.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    else OutlinedButton(onClick = { nav.navigate(pdfNav("/api/leads/$leadId/reviewcard.pdf", "Review cards")) }) { Text("Review cards (QR)") }
                                }
                                else -> {}
                            }
                        }
                    }
                }
            }

            // 3. Monthly posts
            item {
                SectionCard("3. Monthly posts") {
                    Text("Pro plan: post 2–4 times a month. Paste each one into “Add update” on their profile, pick the suggested button, add a photo if you have one.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    OutlinedTextField(
                        notes, { notes = it.take(1000) },
                        label = { Text("Anything to mention this month?") },
                        supportingText = { Text("Specials, closures, new services. Leave blank for seasonal tips.") },
                        minLines = 2,
                        modifier = Modifier.fillMaxWidth().padding(top = 6.dp),
                    )
                    Button(
                        enabled = !busyPosts,
                        onClick = {
                            busyPosts = true
                            update(onError = { busyPosts = false }, after = { busyPosts = false }) { state.api.gbpWritePosts(leadId, 2, notes.trim()) }
                        },
                        modifier = Modifier.padding(top = 4.dp),
                    ) { Text(if (busyPosts) "Writing posts…" else "Write 2 posts with AI") }
                    st.posts.filter { it.isDraft }.forEach { p -> PostDraft(p, onCopy = { context.copyText(p.text) }, onPosted = { update { state.api.gbpSetPosted(leadId, p.id, true) } }, onDelete = { confirmDelete = p.id }) }
                    val posted = st.posts.filter { it.isPosted }.takeLast(6).reversed()
                    if (posted.isNotEmpty()) {
                        Text("Posted", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 12.dp))
                        posted.forEach { p -> Text("✓ ${p.topic} · ${p.month}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                    }
                }
            }

            // 4. Reply to a review
            item {
                SectionCard("4. Reply to a review") {
                    Text("Paste a new review from their profile. Copy the reply back into Google. Never offer anything in exchange for reviews.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    OutlinedTextField(review, { review = it.take(4000) }, label = { Text("The review") }, minLines = 3, modifier = Modifier.fillMaxWidth().padding(top = 6.dp))
                    OutlinedTextField(reviewer, { reviewer = it.take(80) }, label = { Text("Their name (optional)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                    Text("Stars:", style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(top = 6.dp))
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf(5, 4, 3, 2, 1).forEach { n -> FilterChip(selected = stars == n, onClick = { stars = n }, label = { Text("★".repeat(n)) }) }
                    }
                    fun writeReply() {
                        val text = review.trim()
                        if (text.isBlank()) { context.toast("Paste the review first"); return }
                        busyReply = true
                        scope.launch {
                            try {
                                reply = state.api.gbpWriteReply(leadId, text, stars, reviewer.trim().ifBlank { null })
                            } catch (e: Api.Unauthorized) { state.signOut() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { context.toast(e.message ?: "Couldn't write a reply") } finally { busyReply = false }
                        }
                    }
                    Button(enabled = !busyReply, onClick = { writeReply() }, modifier = Modifier.padding(top = 6.dp)) { Text(if (busyReply) "Writing…" else if (reply != null) "Write another version" else "Write reply") }
                    reply?.let { r ->
                        HorizontalDivider(Modifier.padding(vertical = 10.dp))
                        Text(r.reply)
                        if (r.problems.isNotEmpty()) Text("⚠️ ${r.problems.joinToString(", ")}", style = MaterialTheme.typography.bodySmall, color = Warn)
                        OutlinedButton(onClick = { context.copyText(r.reply) }, modifier = Modifier.padding(top = 4.dp)) { Text("Copy reply") }
                    }
                }
            }

            // 5. Facebook & Instagram posts
            item {
                SectionCard("5. Facebook & Instagram posts") {
                    Text("Social media posts extra: 8–12 a month. Send them to the owner to approve, then post them (or they post them). Uses the notes box above.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 6.dp)) {
                        listOf(8 to "Write 8 posts with AI", 4 to "Write 4 more").forEachIndexed { idx, (count, label) ->
                            val click = {
                                busySocial = true
                                update(onError = { busySocial = false }, after = { busySocial = false }) { state.api.gbpWriteSocial(leadId, count, notes.trim()) }
                            }
                            if (idx == 0) Button(onClick = click, enabled = !busySocial) { Text(if (busySocial) "Writing posts… (about 30 seconds)" else label) }
                            else OutlinedButton(onClick = click, enabled = !busySocial) { Text(label) }
                        }
                    }
                    val drafts = st.social.filter { it.isDraft }
                    drafts.forEach { p -> PostDraft(p, onCopy = { context.copyText(p.text) }, onPosted = { update { state.api.gbpSetPosted(leadId, p.id, true) } }, onDelete = { confirmDelete = p.id }) }
                    if (drafts.isNotEmpty()) {
                        OutlinedButton(
                            onClick = {
                                val body = "${greeting()} Here are this month's posts for $name. Reply OK or tell me what to change:\n\n" + drafts.mapIndexed { i, p -> "${i + 1}. ${p.text}" }.joinToString("\n\n")
                                context.sms(phone, body)
                            },
                            modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
                        ) { Text("Text the drafts to the owner to approve") }
                    }
                    val sPosted = st.social.filter { it.isPosted }.takeLast(8).reversed()
                    if (sPosted.isNotEmpty()) {
                        Text("Posted", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 12.dp))
                        sPosted.forEach { p -> Text("✓ ${p.topic} · ${p.month}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                    }
                }
            }

            // 6. Listed everywhere
            item {
                val listed = GBP_LISTINGS.count { st.checked(it.first) }
                SectionCard("6. Listed everywhere  $listed/${GBP_LISTINGS.size}") {
                    Text("Get listed everywhere extra. Use exactly the same name, address, phone and hours on every one.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    if (l.hasRecord) {
                        Column(Modifier.padding(top = 6.dp)) {
                            CopyLine(name) { context.copyText(name) }
                            if (l.addressLine.isNotBlank()) CopyLine(l.addressLine) { context.copyText(l.addressLine) }
                            l.phoneDisplay?.let { CopyLine(it) { context.copyText(it) } }
                            st.website?.let { CopyLine(it) { context.copyText(it) } }
                        }
                    }
                    GBP_LISTINGS.forEach { (key, label, href) ->
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                            Checkbox(checked = st.checked(key), onCheckedChange = { setCheck(key, it) })
                            Text(label, modifier = Modifier.weight(1f))
                            TextButton(onClick = { context.openUrl(href) }) { Text("Open") }
                        }
                    }
                }
            }
        }
    }

    confirmDelete?.let { postId ->
        AlertDialog(
            onDismissRequest = { confirmDelete = null },
            title = { Text("Delete this draft?") },
            confirmButton = {
                TextButton(onClick = {
                    confirmDelete = null
                    update { state.api.gbpRemovePost(leadId, postId) }
                }) { Text("Delete") }
            },
            dismissButton = { TextButton(onClick = { confirmDelete = null }) { Text("Cancel") } },
        )
    }
}

/** One Google or social draft with its copy / posted / delete controls. */
@Composable
private fun PostDraft(p: GbpPostItem, onCopy: () -> Unit, onPosted: () -> Unit, onDelete: () -> Unit) {
    Column(Modifier.fillMaxWidth().padding(top = 10.dp)) {
        HorizontalDivider(Modifier.padding(bottom = 8.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(p.topic, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            p.button?.let { Text(it, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
        }
        Text(p.text, modifier = Modifier.padding(top = 4.dp))
        val detail = (if (p.photo != null) "📷 ${p.photo} · " else "") + p.month + (if (p.button != null) " · ${p.text.length} characters" else "") +
            (if (p.problems.isNotEmpty()) " · ⚠️ ${p.problems.joinToString(", ")}" else "")
        Text(detail, style = MaterialTheme.typography.bodySmall, color = if (p.problems.isNotEmpty()) Warn else MaterialTheme.colorScheme.onSurfaceVariant)
        Row {
            TextButton(onClick = onCopy, contentPadding = PaddingValues(horizontal = 4.dp)) { Text("Copy") }
            TextButton(onClick = onPosted, contentPadding = PaddingValues(horizontal = 8.dp)) { Text("Mark posted", color = Good) }
            TextButton(onClick = onDelete, contentPadding = PaddingValues(horizontal = 8.dp)) { Text("Delete") }
        }
    }
}

/** A line of text with a Copy button beside it (name / address / phone / site for directory listings). */
@Composable
private fun CopyLine(text: String, onCopy: () -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(text, style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
        TextButton(onClick = onCopy) { Text("Copy") }
    }
}
