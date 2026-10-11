package com.knightdx91.websitebusiness.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.knightdx91.websitebusiness.AppState
import com.knightdx91.websitebusiness.net.Api
import com.knightdx91.websitebusiness.net.AppContent
import com.knightdx91.websitebusiness.net.Content
import com.knightdx91.websitebusiness.net.PlanOptions
import com.knightdx91.websitebusiness.net.WalkinLead
import com.knightdx91.websitebusiness.net.fill
import com.knightdx91.websitebusiness.net.flyerLeft
import com.knightdx91.websitebusiness.net.planOptions
import com.knightdx91.websitebusiness.net.walkinLead
import kotlinx.coroutines.launch

/**
 * The in-person guide (owner and callers): what to say and do when you walk into a business, start to finish.
 * With a lead it fills in their name, what to point at on their preview and the best time to go. No AI cost:
 * the copy comes from `GET /api/content`, the prices from `GET /api/plans/options?lead=`.
 */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun WalkinScreen(state: AppState, nav: NavHostController, leadId: String?) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var content by remember { mutableStateOf<Content?>(null) }
    var options by remember { mutableStateOf<PlanOptions?>(null) }
    var lead by remember { mutableStateOf<WalkinLead?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var followUpsOpen by remember { mutableStateOf(false) }
    val meta = state.meta
    val isOwner = meta?.isOwner == true

    LaunchedEffect(leadId) {
        try {
            if (leadId != null) {
                val l = state.api.walkinLead(leadId)
                if (!l.lead.ready) {
                    // Like the web: no preview yet, so there is nothing to show; go to the lead instead.
                    nav.popBackStack()
                    nav.navigate("lead/$leadId")
                    return@LaunchedEffect
                }
                lead = l
            }
            content = AppContent.load(state.api)
            options = state.api.planOptions(leadId)
        } catch (e: Api.Unauthorized) { state.signOut() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { error = e.message ?: "Couldn't load the guide" }
    }

    /** Every link made here goes in the call log by itself, like the web's share buttons. */
    fun sendShare(l: WalkinLead, logNote: String, body: (String) -> String) {
        if (busy) return
        busy = true
        scope.launch {
            try {
                val url = state.api.shareLink(l.lead.id)
                runCatching { state.api.logCall(l.lead.id, "link_sent", logNote, null) }
                context.sms(l.lead.phone, body(url))
            } catch (e: Api.Unauthorized) { state.signOut() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { context.toast(e.message ?: "Couldn't make the link") } finally { busy = false }
        }
    }

    fun copyShare(l: WalkinLead, c: Content) {
        if (busy) return
        busy = true
        scope.launch {
            try {
                val url = state.api.shareLink(l.lead.id)
                runCatching { state.api.logCall(l.lead.id, "link_sent", "Copy message + link", null) }
                context.copyText("Preview link", c.shareText.fill("greeting" to greetingFor(meta), "name" to l.name, "url" to url))
                context.toast("Message with the preview link copied. Paste it anywhere.")
            } catch (e: Api.Unauthorized) { state.signOut() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { context.toast(e.message ?: "Couldn't make the link") } finally { busy = false }
        }
    }

    fun flyer(l: WalkinLead) {
        scope.launch {
            // Marks a New lead Shown first (fire and forget), then opens the printable with the 60-day code.
            runCatching { state.api.flyerLeft(l.lead.id) }
            nav.navigate(pdfNav("/api/leads/${l.lead.id}/flyer.pdf", "Flyer"))
        }
    }

    /** The native sign-up screen makes the lead's sign-up link and lets them sign and pay on this phone. */
    fun openSignup(l: WalkinLead, planId: String) {
        nav.navigate("signup/${l.lead.id}?plan=$planId")
    }

    Scaffold(topBar = {
        TopAppBar(
            title = { Text(lead?.let { "In-person guide: ${it.name}" } ?: "In-person guide", maxLines = 1) },
            navigationIcon = { IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
        )
    }) { pad ->
        val c = content
        val o = options
        if (c == null || o == null) {
            Column(Modifier.fillMaxSize().padding(pad).padding(24.dp)) {
                if (error != null) Text(error ?: "", color = MaterialTheme.colorScheme.error) else CircularProgressIndicator()
            }
            return@Scaffold
        }
        val l = lead
        val isChurch = l?.lead?.category == "church"
        val me = (if (!isOwner || (meta != null && meta.meId.isNotEmpty() && meta.meId != "owner")) meta?.meName else meta?.callerName)?.ifBlank { null } ?: "[your name]"
        val co = meta?.companyName?.ifBlank { null } ?: "[company name]"
        val biz = l?.name ?: "[their business]"
        // Why we're there, in their words.
        val why = when {
            l == null -> "I noticed $biz doesn't have a website"
            l.lead.presence == "social" -> "I noticed $biz is on Facebook but doesn't have its own website"
            l.lead.presence == "elsewhere" -> "I looked $biz up on Google and there's no website on your listing; the only page I found is on ${l.lead.foundHost ?: "another site"}, so it isn't really yours"
            l.lead.presence == "outdated" || l.lead.presence == "free_builder" -> "I pulled up your website on my phone and it was hard to use"
            else -> "I noticed $biz doesn't have a website"
        }
        val mid = o.middle
        val noSetup = o.noSetupClause
        // What to point at on the preview: only things the preview really has.
        val show = listOfNotNull(
            c.walkinShow.name,
            if (l == null || l.hasHours) c.walkinShow.hours else null,
            c.walkinShow.directions,
            when {
                l != null && l.lead.category == "restaurant" -> c.walkinShow.menu
                l != null && l.services.isNotEmpty() -> c.walkinShow.services.fill("services" to l.services.joinToString(", "))
                else -> c.walkinShow.servicesGeneric
            },
            c.walkinShow.reviews,
        )
        val questions = c.walkinQuestions.before + (if (l?.lead?.category == "restaurant") c.walkinQuestions.restaurant else c.walkinQuestions.services) + c.walkinQuestions.after
        val objections = (if (isChurch) c.walkinObjectionsChurch else c.walkinObjections).map { it.question to it.answer.fill("price" to o.priceShort) }
        val open = l != null && l.lead.salesStatus != "live"
        val muted = MaterialTheme.colorScheme.onSurfaceVariant
        val timing = if (l != null) (if (l.lead.bestTime != null) "${l.lead.bestTime} (what they told us). " else "") + (c.walkinTiming[l.lead.category] ?: c.walkinTimingUnknown) else c.walkinTimingGeneral

        LazyColumn(Modifier.fillMaxSize().padding(pad), contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            item {
                if (l != null) {
                    Text(listOfNotNull(l.variantLabel ?: categoryLabel(l.lead.category), l.lead.reason).joinToString(" · "), style = MaterialTheme.typography.bodyMedium, color = muted)
                    l.lead.address?.let { Text(it, modifier = Modifier.padding(top = 4.dp)) }
                    if (l.today.isNotBlank()) Text(l.today, fontWeight = FontWeight.Bold)
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
                        Button(onClick = { nav.navigate("preview/${l.lead.id}") }) { Text("📱 Open their preview") }
                        OutlinedButton(onClick = { if (l.mapsUrl != null) context.openUrl(l.mapsUrl) else context.directions(l.lead.address, l.lead.lat, l.lead.lng) }) { Text("🗺️ Directions") }
                        OutlinedButton(onClick = { flyer(l) }) { Text("🖨️ Flyer to leave") }
                    }
                    if (l.lead.contact != null || l.lead.bestTime != null) Text("👤 ${listOfNotNull(l.lead.contact?.let { "Ask for: $it" }, l.lead.bestTime).joinToString(" · ")}", modifier = Modifier.padding(top = 6.dp))
                } else {
                    Text("What to say and do when you walk into a business, start to finish. Open it from a lead (or a stop on your walk-in route) and it fills in their name, what to show them and the best time to go.", color = muted)
                    Button(onClick = { nav.navigate("route") }, modifier = Modifier.padding(top = 8.dp)) { Text("🗺️ Plan a walk-in route") }
                }
            }

            item {
                StepCard(1, "Before you walk in") {
                    Bullets(listOf(
                        "Best time: $timing",
                        "Open their preview before you go in so it's loaded. Turn your brightness up and silence your phone.",
                        "Bring the printed flyer. It has a code that opens their website for 60 days, so you can leave it behind.",
                        "Look at their Google listing first: the owner's name is often in replies to reviews. Using it helps.",
                        "See a “No soliciting” sign? Don't go in. Call instead.",
                    ))
                }
            }

            item {
                StepCard(2, "Walk in", highlight = true) {
                    Text("Wait until no customer needs them. Smile, keep it short.", style = MaterialTheme.typography.bodySmall, color = muted)
                    val contact = l?.lead?.contact
                    SayLine(
                        when {
                            contact != null -> "Hi! Is $contact around? I'll only need a minute."
                            isChurch -> "Hi! Is the pastor or the church secretary in? I'll only need a minute."
                            else -> "Hi! Is the owner or manager around? I'll only need a minute."
                        },
                    )
                    if (contact != null) Text("Ask for $contact.", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodySmall)
                    Text("When you have ${contact ?: if (isChurch) "the pastor (or whoever handles their Facebook)" else "the owner"}:", style = MaterialTheme.typography.bodySmall, color = muted, modifier = Modifier.padding(top = 4.dp))
                    SayLine("I'm $me with $co. We're local, here in Cullman. $why, so I went ahead and built you one. Can I show you real quick? It's free to look at.")
                    if (l != null && l.lead.category == "finance" && l.variant == "financial_advisor") Text("Advisors: ask this first. “Does your firm let you use your own website?” Many must use the firm's site or get compliance approval. If they can't, thank them and log it.", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold)
                    if (l != null && l.lead.category == "finance" && l.variant == "tax_prep") Text("January to mid-April is their busy season. If you're there then, keep it to one minute and offer to come back in May.", style = MaterialTheme.typography.bodySmall, color = muted)
                    if (isChurch) Text("Churches decide together: expect “we'll take it to the deacons” (or elders, council, session). Leave the flyer for that meeting, ask when it is, and book the callback for the day after. Fall is budget season.", style = MaterialTheme.typography.bodySmall, color = muted)
                    ObjectionRow("Owner isn't there", "“No problem. When's a good time to catch them? Could I leave this for them?” Leave the flyer, ask the owner's name and the best time, then log a callback below.")
                    ObjectionRow("They're slammed", "“I can see you're busy. I'll come back. Is tomorrow morning better?” Log the callback, and go.")
                }
            }

            item {
                StepCard(3, "Show them their website") {
                    Bullets(listOf(
                        "Hand them your phone folded (phone view). Let them hold it.",
                        "Say: “This is what people see when they look you up on their phone.”",
                        "Point at a few things:",
                    ))
                    Bullets(show, Modifier.padding(start = 14.dp))
                    Bullets(listOf(
                        "Then unfold it and tap Desktop view: “And here's how it looks on a computer.”",
                        "Let them scroll. Stop talking for a bit.",
                    ))
                    SayLine("What do you think? Anything you'd change?")
                    Text("Anything they'd change means they're picturing it as theirs. Write it in the notes below.", style = MaterialTheme.typography.bodySmall, color = muted)
                }
            }

            item {
                StepCard(4, "Ask a few questions") {
                    Bullets(questions)
                    Text("Their answers tell you which plan fits, and fill in what the site still needs.", style = MaterialTheme.typography.bodySmall, color = muted, modifier = Modifier.padding(top = 6.dp))
                }
            }

            item {
                StepCard(5, "Talk price, once they like it") {
                    if (mid != null) SayLine("Most folks go with ${mid.name}. It's ${moneyDollars(mid.monthly)} a month$noSetup. We host it, keep it running, and make changes whenever you text us.")
                    Text("Lead with the middle plan. Go down if price is the worry, up if they want everything done for them.", style = MaterialTheme.typography.bodySmall, color = muted)
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
                        OutlinedButton(onClick = { nav.navigate(if (l != null) "plans/${l.lead.id}" else "plans") }) { Text("📋 Show them the plans") }
                        OutlinedButton(onClick = { nav.navigate(pdfNav("/api/contract.pdf" + (if (l != null) "?lead=${l.lead.id}" else ""), "Agreement")) }) { Text("📄 Show them the agreement") }
                        OutlinedButton(onClick = { nav.navigate("playbook") }) { Text("💬 Plans & answers") }
                    }
                }
            }

            item {
                StepCard(6, "Ask for the yes", highlight = true) {
                    SayLine("Want me to get it live for you this week?")
                    Bullets(listOf(
                        "If yes: tap Show them the plans, let them pick, then hand them your phone. They choose how to pay, read and sign the agreement, and type their own card on the secure page.",
                        "Never write down or type in a card number for them.",
                        "Once they've signed, mark them Sold below.",
                    ))
                }
            }

            item {
                StepCard(7, "If it's not a yes today") {
                    SayLine("No pressure at all. Can I text you the link so you can look at it tonight?")
                    Bullets(listOf(
                        "Only text it after they say OK. It works for 14 days, no login needed.",
                        "Leave the flyer either way.",
                        "Set a callback for 2 or 3 days out, then follow up.",
                    ))
                    if (l != null && open) {
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
                            OutlinedButton(enabled = !busy, onClick = { sendShare(l, "Text preview link") { url -> c.shareText.fill("greeting" to greetingFor(meta), "name" to l.name, "url" to url) } }) { Text("💬 Text preview link") }
                            OutlinedButton(enabled = !busy, onClick = { copyShare(l, c) }) { Text("🔗 Copy message + link") }
                        }
                        Text("Only text the link after they say it's OK. It works for 14 days, no login needed.", style = MaterialTheme.typography.bodySmall, color = muted)
                        TextButton(onClick = { followUpsOpen = !followUpsOpen }, contentPadding = PaddingValues(0.dp)) { Text(if (followUpsOpen) "▾ Follow-up texts" else "▸ Follow-up texts") }
                        if (followUpsOpen) {
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                c.followUps.forEach { f ->
                                    OutlinedButton(enabled = !busy, onClick = { sendShare(l, "Follow-up: ${f.label}") { url -> f.text.fill("greeting" to greetingFor(meta), "name" to l.name, "url" to url) } }) { Text(f.label) }
                                }
                            }
                            Text("Each one opens a text with a fresh preview link. Send it yourself; skip it if they asked you to stop.", style = MaterialTheme.typography.bodySmall, color = muted)
                        }
                    }
                }
            }

            item {
                SectionCard("If they say…") {
                    objections.forEach { (q, a) -> ObjectionRow(q, a) }
                    TextButton(onClick = { nav.navigate("playbook") }, contentPadding = PaddingValues(0.dp)) { Text("💬 All plans & common answers") }
                }
            }

            item { SectionCard("Always") { Bullets(c.walkinAlways) } }

            if (l != null && open) {
                item {
                    SectionCard("Sign them up") {
                        val plans = o.plans
                        if (plans.isNotEmpty()) {
                            Text("Pick a plan. They choose how to pay (yearly, month to month or the standard term), sign with their name and set up automatic payment, on your phone or theirs.", style = MaterialTheme.typography.bodySmall, color = muted)
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
                                OutlinedButton(onClick = { nav.navigate("plans/${l.lead.id}") }) { Text("📋 Show them the plans") }
                                OutlinedButton(onClick = { nav.navigate(pdfNav("/api/contract.pdf?lead=${l.lead.id}", "Agreement")) }) { Text("📄 Show them the agreement") }
                                OutlinedButton(onClick = { nav.navigate(pdfNav("/api/ach.pdf?lead=${l.lead.id}", "Payment authorization form")) }) { Text("🏦 Payment authorization form") }
                            }
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
                                plans.forEach { p ->
                                    if (p.id == "plus") Button(enabled = !busy, onClick = { openSignup(l, p.id) }) { Text("${p.name} · ${moneyDollars(p.monthly)}/mo") }
                                    else OutlinedButton(enabled = !busy, onClick = { openSignup(l, p.id) }) { Text("${p.name} · ${moneyDollars(p.monthly)}/mo") }
                                }
                            }
                            Text("A plan button opens the sign-up page here so they can sign on your phone right now.", style = MaterialTheme.typography.bodySmall, color = muted, modifier = Modifier.padding(top = 6.dp))
                        } else {
                            Text(if (isOwner) "Add your plans and prices in Settings first." else "The owner hasn't set up plans yet.", style = MaterialTheme.typography.bodySmall, color = muted)
                        }
                    }
                }
                item {
                    SectionCard("Log this visit") {
                        Text("How it went, notes, the callback day and marking them Sold are on the lead screen.", style = MaterialTheme.typography.bodySmall, color = muted)
                        Button(onClick = { nav.navigate("lead/${l.lead.id}") }, modifier = Modifier.padding(top = 8.dp)) { Text("📝 Log the visit") }
                    }
                }
            }
        }
    }
}
