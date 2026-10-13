package com.knightdx91.websitebusiness.ui

import android.graphics.Bitmap
import android.graphics.Paint
import android.net.Uri
import android.util.Base64
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import com.knightdx91.websitebusiness.net.FounderChoice
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.Saver
import androidx.compose.runtime.saveable.listSaver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.snapshots.SnapshotStateMap
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshots.SnapshotStateList
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.input.pointer.pointerInput
import org.json.JSONObject
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.navigation.NavHostController
import com.knightdx91.websitebusiness.AppState
import com.knightdx91.websitebusiness.net.AddonInfo
import com.knightdx91.websitebusiness.net.Api
import com.knightdx91.websitebusiness.net.BillingChoice
import com.knightdx91.websitebusiness.net.ContractDoc
import com.knightdx91.websitebusiness.net.ExtraPick
import com.knightdx91.websitebusiness.net.Lead
import com.knightdx91.websitebusiness.net.PlanOffer
import com.knightdx91.websitebusiness.net.PlanOptions
import com.knightdx91.websitebusiness.net.SignupResult
import com.knightdx91.websitebusiness.net.contractJson
import com.knightdx91.websitebusiness.net.createSignup
import com.knightdx91.websitebusiness.net.payComplete
import com.knightdx91.websitebusiness.net.payStart
import com.knightdx91.websitebusiness.net.picksParam
import com.knightdx91.websitebusiness.net.planOptions
import com.knightdx91.websitebusiness.tap.TapToPayActivity
import com.stripe.android.PaymentConfiguration
import com.stripe.android.paymentsheet.PaymentSheet
import com.stripe.android.paymentsheet.PaymentSheetResult
import com.stripe.android.paymentsheet.PaymentSheetResultCallback
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.util.Random
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToLong

/*
 * The in-person sign-up: the owner hands the phone to the client, who picks a way to pay and extras, reads the
 * agreement, signs with a finger, and then pays right here (card tapped on the phone, card typed into Stripe's
 * PaymentSheet, or a texted payment link; invoice orders pay nothing online). It mirrors the web sign-up page
 * (`serveSignup` + `pickerHtml` in the Worker) with the same wording and rules. Route: signup/{lead}?plan={plan}.
 */

/** The way-to-pay id that means "send me an invoice" (checkout.ts INVOICE_BILLING). */
private const val INVOICE = "invoice"
private const val MAX_QTY = 20
private const val MAX_FEATURED = 5
private val FEATURED_EXTRAS = Regex("order|book|photo|spanish|logo|nfc|review card", RegexOption.IGNORE_CASE)
private val EMAIL = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")
private const val GO_LIVE = "Your site goes live within 3 business days after you approve the final details (same day only with the paid Same-day build extra)."
private const val CONSENT = "I've read the agreement and I agree to it; my drawn signature is my electronic signature"

/** The customer reads and signs on this screen, so it is always light, whatever the phone's theme. */
private val SignupLight = lightColorScheme(
    primary = Navy,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFDDE3F2),
    onPrimaryContainer = Navy,
    secondary = Orange,
    onSecondary = Navy,
    secondaryContainer = Color(0xFFFFE8C2),
    onSecondaryContainer = Color(0xFF4A2E00),
    background = Color(0xFFF4F5F8),
    surface = Color.White,
    onSurface = Color(0xFF1B1F2A),
    surfaceVariant = Color(0xFFECEEF3),
    onSurfaceVariant = Color(0xFF5B6270),
    outline = Color(0xFFD5D9E1),
)

/** The Domain name extra (db.ts isDomainAddon) and a plan that includes a domain (planIncludesDomain): free on Pro. */
private val DOMAIN_EXTRA = Regex("\\bdomain\\b", RegexOption.IGNORE_CASE)
private fun AddonInfo.isDomain() = DOMAIN_EXTRA.containsMatchIn(name)
private fun PlanOffer.includesDomain() = includes.any { it.contains("own domain", ignoreCase = true) }

private data class Totals(val today: Long, val again: Long, val interval: String, val invoice: Boolean)

/** The same math as pickerHtml's live total: the plan's way to pay (priced on the server) plus the ticked extras. */
private fun totals(o: PlanOptions, p: PlanOffer, billing: String, picks: Map<Int, Int>): Totals {
    val invoice = billing == INVOICE && o.invoice
    val standard = p.options.firstOrNull { it.id == "standard" } ?: p.options.firstOrNull()
    val opt = (if (invoice) standard else p.options.firstOrNull { it.id == billing } ?: standard) ?: return Totals(0, 0, "month", invoice)
    val yearly = opt.id == "annual"
    var today = opt.dueTodayCents
    var again = opt.renewsCents ?: if (yearly) opt.dueTodayCents else (p.monthly * 100).roundToLong()
    for ((i, q) in picks) {
        val a = o.addons.getOrNull(i) ?: continue
        if (a.unit == "quote" || (a.isDomain() && p.includesDomain())) continue
        val cents = (a.amount * 100).roundToLong()
        when (a.unit) {
            "month" -> { val amt = if (yearly) cents * 12 else cents; again += amt; today += amt }
            "each" -> today += cents * q.coerceIn(1, MAX_QTY)
            else -> today += cents
        }
    }
    return Totals(today, again, if (yearly) "year" else "month", invoice)
}

/** The plain-language line under each way to pay (pickerHtml's billingLabel). */
private fun wayDetail(o: PlanOptions, p: PlanOffer, b: BillingChoice): String {
    val t = o.terms
    return when (b.id) {
        "flex" -> "Monthly price plus a one-time ${moneyDollars(p.setup + t.flex)} setup fee. No minimum."
        "annual" -> if (o.church) "Ministry rate: 12 months for the price of ${12 - t.free} — ${moneyDollars(p.monthly * (12 - t.free))}/year. No setup fee."
        else "Pay 12 months up front for the price of ${12 - t.free}. No setup fee."
        else -> "Monthly price, no setup fee. ${if (b.id == "short") t.short else t.min}-month minimum, then cancel any time."
    }
}

private fun cleanName(s: String) = s.trim().replace(Regex("\\s+"), " ").take(100)

/** The extras picked, as [index, qty, index, qty, …] for rememberSaveable. */
private val PICKS_SAVER = listSaver<SnapshotStateMap<Int, Int>, Int>(
    save = { m -> m.entries.flatMap { listOf(it.key, it.value) } },
    restore = { l -> mutableStateMapOf<Int, Int>().apply { var i = 0; while (i + 1 < l.size) { put(l[i], l[i + 1]); i += 2 } } },
)

/** The signed order, kept as its JSON ("" = not signed yet). */
private val SIGNED_SAVER = Saver<SignupResult?, String>(
    save = { it?.raw ?: "" },
    restore = { if (it.isEmpty()) null else SignupResult.from(JSONObject(it)) },
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SignupScreen(state: AppState, nav: NavHostController, leadId: String, planId: String?) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val company = state.meta?.companyName?.ifBlank { null } ?: "Underground Associates"

    var options by remember { mutableStateOf<PlanOptions?>(null) }
    var lead by remember { mutableStateOf<Lead?>(null) }
    var error by remember { mutableStateOf<String?>(null) }

    // What was typed and signed survives leaving this screen (the signed-agreement PDF, Tap to Pay) and coming back:
    // before this, "View the signed agreement" came back to a blank form that asked for a second signature.
    var plan by rememberSaveable { mutableStateOf(planId ?: "") }
    var changingPlan by remember { mutableStateOf(false) }
    var billing by rememberSaveable { mutableStateOf("standard") }
    var moreWays by remember { mutableStateOf(false) }
    var moreExtras by remember { mutableStateOf(false) }
    val picks = rememberSaveable(saver = PICKS_SAVER) { mutableStateMapOf<Int, Int>() }

    /** The free extra a founding customer picked (index into the extras), while spots are open. */
    var founder by rememberSaveable { mutableStateOf<Int?>(null) }
    var business by rememberSaveable { mutableStateOf("") }
    var name by rememberSaveable { mutableStateOf("") }
    var title by rememberSaveable { mutableStateOf("") }
    var email by rememberSaveable { mutableStateOf("") }
    var tried by remember { mutableStateOf(false) }

    var agreementOpen by remember { mutableStateOf(false) }
    val strokes = remember { mutableStateListOf<List<Offset>>() }
    var padSize by remember { mutableStateOf(IntSize.Zero) }
    var consent by remember { mutableStateOf(false) }
    var signing by remember { mutableStateOf(false) }
    var signed by rememberSaveable(stateSaver = SIGNED_SAVER) { mutableStateOf<SignupResult?>(null) }

    // Paying on this phone, after signing.
    var paySecret by remember { mutableStateOf<String?>(null) }
    var payBusy by remember { mutableStateOf(false) }
    var paidText by rememberSaveable { mutableStateOf<String?>(null) }
    var payNote by rememberSaveable { mutableStateOf<String?>(null) }
    var tapUntil by rememberSaveable { mutableLongStateOf(0L) }

    LaunchedEffect(leadId) {
        try {
            val o = state.api.planOptions(leadId)
            val d = state.api.lead(leadId)
            lead = d.lead
            if (business.isBlank()) business = d.lead.name
            // Three-tap sign-up: the signer's name and email start filled from what the team already typed (changeable).
            if (name.isBlank()) name = o.prefillName
            if (email.isBlank()) email = o.prefillEmail
            if (o.plans.none { it.id == plan }) plan = (o.plans.firstOrNull { it.id == "plus" } ?: o.plans.firstOrNull())?.id ?: ""
            options = o
        } catch (e: Api.Unauthorized) { state.signOut() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { error = e.message ?: "Couldn't load the plans" }
    }

    val pickList = picks.entries.sortedBy { it.key }.map { ExtraPick(it.key, it.value.coerceIn(1, MAX_QTY)) }
    val orderKey = "$plan|$billing|${picksParam(pickList)}|$business"
    // Like the web page: changing the order or the business name clears the signature.
    LaunchedEffect(orderKey) { strokes.clear(); consent = false }

    val nameOk = cleanName(name).let { it.length >= 3 && it.contains(" ") }
    val emailOk = EMAIL.matches(email.trim())
    val businessOk = business.isNotBlank()
    val inked = strokes.sumOf { it.size } >= 8

    fun leave() {
        nav.popBackStack()
        nav.navigate("lead/$leadId")
    }
    BackHandler(enabled = signed != null) { leave() }

    fun sign() {
        val o = options ?: return
        val p = o.plans.firstOrNull { it.id == plan } ?: return
        tried = true
        if (!nameOk || !emailOk || !businessOk) { context.toast("Add the business name, your full name and email first"); return }
        if (!inked) { context.toast("Please sign in the box"); return }
        if (!consent) { context.toast("Please tick the agreement box"); return }
        signing = true
        scope.launch {
            try {
                val sig = withContext(Dispatchers.Default) { signaturePng(strokes.toList(), padSize.width, padSize.height) }
                if (sig.length > 200_000) throw IllegalStateException("The signature image is too large; clear it and sign again")
                val r = state.api.createSignup(leadId, p.id, billing, pickList, business.trim(), cleanName(name), title.trim(), email.trim(), sig, founder)
                signed = r
                agreementOpen = false
            } catch (e: Api.Unauthorized) { state.signOut() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { context.toast(e.message ?: "Couldn't save the sign-up") } finally { signing = false }
        }
    }

    // ---- paying on this phone ----

    suspend fun checkPaid(): Boolean {
        val s = signed ?: return false
        return try {
            val paid = state.api.lead(leadId).signups.firstOrNull { it.id == s.signupId }?.paid == true
            if (paid) { paidText = "✅ Paid. The receipt goes to ${email.trim()}."; payNote = null }
            paid
        } catch (e: Api.Unauthorized) { state.signOut(); false } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { false }
    }

    fun tap() {
        val s = signed ?: return
        scope.launch {
            payBusy = true
            try {
                payNote = "Opening Tap to Pay…"
                val r = state.api.startTap(leadId, s.signupId)
                if (r.optBoolean("alreadyPaid")) { paidText = "✅ Paid."; payNote = null; return@launch }
                tapUntil = System.currentTimeMillis() + 10 * 60_000L
                payNote = "Tap the card on the back of the phone. This screen updates when it's paid."
                context.startActivity(TapToPayActivity.intent(context, r.getString("token"), state.api.origin))
            } catch (e: Api.Unauthorized) { state.signOut() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { payNote = e.message ?: "Couldn't start the payment" } finally { payBusy = false }
        }
    }
    // Poll while a tap is in flight (up to 10 minutes) and once more whenever the screen comes back.
    LaunchedEffect(tapUntil) {
        if (tapUntil == 0L) return@LaunchedEffect
        while (System.currentTimeMillis() < tapUntil && paidText == null) {
            delay(3_000)
            if (checkPaid()) break
        }
    }
    LifecycleResumeEffect(signed?.signupId) {
        if (signed != null && paidText == null && tapUntil > 0L) scope.launch { checkPaid() }
        onPauseOrDispose {}
    }

    val paymentSheet = remember {
        PaymentSheet.Builder(
            PaymentSheetResultCallback { result ->
                when (result) {
                    is PaymentSheetResult.Completed -> {
                        val s = signed
                        val secret = paySecret
                        if (s != null && secret != null) scope.launch {
                            payBusy = true
                            payNote = "Finishing the payment…"
                            try {
                                val d = state.api.payComplete(s.signupId, secret.substringBefore("_secret_"))
                                val line = d.message ?: buildString {
                                    append("✅ Paid ").append(money(d.amountCents))
                                    if (!d.card.isNullOrBlank()) append(" with ").append(d.card)
                                    if (!d.renewsOn.isNullOrBlank()) append(". Renews on ").append(d.renewsOn)
                                    append(".")
                                }
                                if (d.ok) { paidText = line; payNote = null } else payNote = line
                            } catch (e: Api.Unauthorized) { state.signOut() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) {
                                payNote = e.message ?: "The card was saved but the charge didn't finish; check the lead page."
                            } finally { payBusy = false }
                        }
                    }
                    is PaymentSheetResult.Canceled -> {}
                    is PaymentSheetResult.Failed -> payNote = result.error.message ?: "The payment didn't go through"
                }
            },
        )
    }.build()

    fun enterCard() {
        val s = signed ?: return
        scope.launch {
            payBusy = true
            try {
                val p = state.api.payStart(s.signupId)
                PaymentConfiguration.init(context, p.publishableKey)
                paySecret = p.clientSecret
                payNote = null
                paymentSheet.presentWithSetupIntent(p.clientSecret, PaymentSheet.Configuration.Builder(company).allowsDelayedPaymentMethods(false).build())
            } catch (e: Api.Unauthorized) { state.signOut() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { payNote = e.message ?: "Couldn't open the card form" } finally { payBusy = false }
        }
    }

    fun textLink() {
        val s = signed ?: return
        val url = s.checkoutUrl ?: return
        val planName = options?.plans?.firstOrNull { it.id == plan }?.name ?: "website"
        context.sms(lead?.phone, "${greetingFor(state.meta)} Here's the secure payment link to finish setting up the $planName plan for ${business.trim()}: $url")
    }

    MaterialTheme(colorScheme = SignupLight) {
        Scaffold(
            containerColor = SignupLight.background,
            topBar = {
                TopAppBar(
                    title = { Text(company, maxLines = 1) },
                    navigationIcon = { IconButton(onClick = { if (signed != null) leave() else nav.popBackStack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
                )
            },
        ) { pad ->
            val o = options
            val p = o?.plans?.firstOrNull { it.id == plan }
            if (o == null || p == null) {
                Column(Modifier.fillMaxSize().padding(pad).padding(24.dp)) {
                    if (error != null) Text(error ?: "", color = MaterialTheme.colorScheme.error)
                    else if (o != null) Text("No plan is set up yet. Add plans in Settings first.", color = MaterialTheme.colorScheme.error)
                    else CircularProgressIndicator()
                }
                return@Scaffold
            }
            val s = signed
            if (s != null) {
                ResultCard(
                    pad = pad, result = s, firstName = cleanName(name).substringBefore(" "), business = business.trim(), plan = p, options = o, billing = billing, picks = pickList,
                    email = email.trim(), company = company, paidText = paidText, payNote = payNote, payBusy = payBusy,
                    onTap = { tap() }, onCard = { enterCard() }, onText = { textLink() },
                    onAgreement = { nav.navigate("pdf?path=" + Uri.encode(s.agreementPdf) + "&title=" + Uri.encode("Signed agreement")) },
                    onDone = { leave() },
                )
                return@Scaffold
            }

            val t = totals(o, p, billing, picks)
            val mainWays = p.options.filter { it.id == "standard" || it.id == "annual" }
            val otherWays = p.options.filter { it !in mainWays }
            val standard = p.options.firstOrNull { it.id == "standard" } ?: p.options.firstOrNull()
            val featured = LinkedHashSet<Int>()
            o.addons.forEachIndexed { i, a -> if (featured.size < MAX_FEATURED && a.group != "inventory" && FEATURED_EXTRAS.containsMatchIn(a.name)) featured.add(i) }
            val invExtras = o.addons.indices.filter { o.addons[it].group == "inventory" }
            val topExtras = o.addons.indices.filter { it in featured }
            val restExtras = o.addons.indices.filter { it !in featured && it !in invExtras }

            LazyColumn(Modifier.fillMaxSize().padding(pad), contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                item {
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(16.dp)) {
                            Text("Website plan for", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(business.ifBlank { lead?.name ?: "your business" }, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                        }
                    }
                }
                item {
                    SectionCard("Sign up") {
                        if (!changingPlan) {
                            Row(Modifier.fillMaxWidth().padding(top = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                                Text("Plan: ", style = MaterialTheme.typography.bodyLarge)
                                Text(p.name, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Bold)
                                Text(" · ${moneyDollars(p.monthly)}/month", style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
                                TextButton(onClick = { changingPlan = true }) { Text("change plan") }
                            }
                        } else {
                            Text("Pick a plan", fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 8.dp, bottom = 4.dp))
                            o.plans.forEach { q ->
                                ChoiceCard(selected = q.id == plan, onClick = { plan = q.id; if (q.options.none { it.id == billing } && billing != INVOICE) billing = "standard" }) {
                                    Text("${q.name} · ${moneyDollars(q.monthly)}/month", fontWeight = FontWeight.Bold)
                                    if (q.includes.isNotEmpty()) Text(q.includes.joinToString(" · "), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    }
                }
                item {
                    SectionCard("How would you like to pay?") {
                        Spacer(Modifier.height(6.dp))
                        mainWays.forEach { b -> WayCard(b.label, wayDetail(o, p, b), billing == b.id) { billing = b.id } }
                        if (o.invoice && standard != null) {
                            WayCard("Pay by check or bank transfer", "We'll send an invoice for the ${standard.label} at the monthly price, no setup fee. Nothing is charged online.", billing == INVOICE) { billing = INVOICE }
                        }
                        if (otherWays.isNotEmpty()) {
                            TextButton(onClick = { moreWays = !moreWays }, contentPadding = PaddingValues(0.dp)) { Text(if (moreWays) "▾ Other ways to pay" else "▸ Other ways to pay") }
                            if (moreWays || otherWays.any { it.id == billing }) otherWays.forEach { b -> WayCard(b.label, wayDetail(o, p, b), billing == b.id) { billing = b.id } }
                        }
                    }
                }
                if (invExtras.isNotEmpty() && plan == "list") item {
                    SectionCard("Inventory add-ons") {
                        Text("(optional)", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.height(6.dp))
                        invExtras.forEach { i -> ExtraRow(o.addons[i], picks[i], included = if (o.addons[i].isDomain() && p.includesDomain()) p.name else null, onChange = { q -> if (q == null) picks.remove(i) else picks[i] = q }) }
                    }
                }
                if (topExtras.isNotEmpty() || restExtras.isNotEmpty()) item {
                    SectionCard("Add extras") {
                        Text("(optional)", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.height(6.dp))
                        topExtras.forEach { i -> ExtraRow(o.addons[i], picks[i], included = if (o.addons[i].isDomain() && p.includesDomain()) p.name else null, onChange = { q -> if (q == null) picks.remove(i) else picks[i] = q }) }
                        if (restExtras.isNotEmpty()) {
                            TextButton(onClick = { moreExtras = !moreExtras }, contentPadding = PaddingValues(0.dp)) { Text(if (moreExtras) "▾ More extras" else "▸ More extras") }
                            if (moreExtras) restExtras.forEach { i -> ExtraRow(o.addons[i], picks[i], included = if (o.addons[i].isDomain() && p.includesDomain()) p.name else null, onChange = { q -> if (q == null) picks.remove(i) else picks[i] = q }) }
                        }
                    }
                }
                if (invExtras.isNotEmpty() && plan != "list") item {
                    SectionCard("Inventory add-ons") {
                        Text("(optional, for the live price list)", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.height(6.dp))
                        invExtras.forEach { i -> ExtraRow(o.addons[i], picks[i], included = if (o.addons[i].isDomain() && p.includesDomain()) p.name else null, onChange = { q -> if (q == null) picks.remove(i) else picks[i] = q }) }
                    }
                }
                o.founder?.takeIf { it.slotsLeft > 0 && it.choices.isNotEmpty() }?.let { f -> item {
                    SectionCard("🎁 Founding-customer bonus") {
                        Text("You're one of our first ${f.total} clients: pick one of these free with your plan${if (f.slotsLeft <= 2) " (${f.slotsLeft} spot${if (f.slotsLeft == 1) "" else "s"} left)" else ""}.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.height(6.dp))
                        f.choices.forEach { c -> FounderRow(c, founder == c.index) { founder = if (founder == c.index) null else c.index } }
                        Text(if (founder == null) "Nothing picked yet (that's fine)." else "Added free: ${f.choices.firstOrNull { it.index == founder }?.name ?: ""}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                } }
                o.referredBy?.let { r -> item {
                    Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color(0xFFEEF3FF))) {
                        Text("🤝 Referred by ${r.name}. Once this plan's first payment goes through, they get ${r.months} month${if (r.months == 1) "" else "s"} free.", modifier = Modifier.padding(14.dp), style = MaterialTheme.typography.bodyMedium)
                    }
                } }
                item {
                    Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Navy)) {
                        Column(Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.Bottom) {
                                Text(if (t.invoice) "On your first invoice: " else "Due today: ", color = Color.White, style = MaterialTheme.typography.bodyLarge)
                                Text(money(t.today), color = Color.White, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                            }
                            Text("Then ${money(t.again)} per ${t.interval}${if (t.invoice) ", invoiced." else ", charged automatically."}", color = Color(0xFFDDE3F2), style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
                item {
                    SectionCard("Your details") {
                        OutlinedTextField(business, { business = it.take(120) }, label = { Text("Business name") }, singleLine = true, isError = tried && !businessOk, modifier = Modifier.fillMaxWidth().padding(top = 8.dp))
                        OutlinedTextField(
                            name, { name = it.take(100) }, label = { Text("Your full name") }, singleLine = true, isError = tried && !nameOk,
                            supportingText = if (tried && !nameOk) ({ Text("First and last name, please") }) else null,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text), modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                        )
                        OutlinedTextField(title, { title = it.take(60) }, label = { Text("Your title (optional)") }, placeholder = { Text("Owner") }, singleLine = true, modifier = Modifier.fillMaxWidth().padding(top = 8.dp))
                        OutlinedTextField(
                            email, { email = it.take(120) }, label = { Text("Email for receipts") }, singleLine = true, isError = tried && !emailOk,
                            supportingText = if (tried && !emailOk) ({ Text("Please check the email address") }) else null,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email), modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                        )
                    }
                }
                item {
                    SectionCard("Your agreement") {
                        Text("Read the agreement for exactly what you picked, then sign at the bottom of it.", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 4.dp))
                        Button(onClick = { tried = true; agreementOpen = true }, modifier = Modifier.fillMaxWidth().padding(top = 10.dp).height(52.dp)) { Text("Read and sign the agreement") }
                        Text("See also our cancellation & refund policy and privacy policy.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 10.dp))
                        Row {
                            TextButton(onClick = { context.openUrl("https://undergroundassociates.com/terms#refunds") }, contentPadding = PaddingValues(0.dp)) { Text("Refund policy") }
                            Spacer(Modifier.width(16.dp))
                            TextButton(onClick = { context.openUrl("https://undergroundassociates.com/privacy") }, contentPadding = PaddingValues(0.dp)) { Text("Privacy policy") }
                        }
                        Text(GO_LIVE, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 6.dp))
                        Text("Payment is handled securely by Stripe. We never see your card number.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 8.dp, bottom = 8.dp))
                    }
                }
            }

            if (agreementOpen) {
                AgreementDialog(
                    state = state, leadId = leadId, plan = p.id, billing = billing, picks = pickList,
                    signerLine = listOf(cleanName(name), title.trim()).filter { it.isNotBlank() }.joinToString(", ") + (if (emailOk) " · ${email.trim()}" else ""),
                    detailsOk = nameOk && emailOk && businessOk,
                    strokes = strokes, onPadSize = { padSize = it }, consent = consent, onConsent = { consent = it },
                    inked = inked, signing = signing, onSign = { sign() }, onClose = { agreementOpen = false },
                )
            }
        }
    }
}

/** A selectable card with a radio button: ways to pay and the plan picker. */
@Composable
private fun ChoiceCard(selected: Boolean, onClick: () -> Unit, content: @Composable () -> Unit) {
    Card(
        Modifier.fillMaxWidth().padding(bottom = 8.dp).selectable(selected = selected, role = Role.RadioButton, onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = if (selected) Color(0xFFFFF7E6) else MaterialTheme.colorScheme.surface),
        border = androidx.compose.foundation.BorderStroke(if (selected) 2.dp else 1.dp, if (selected) Orange else MaterialTheme.colorScheme.outline),
    ) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.Top) {
            RadioButton(selected = selected, onClick = null)
            Column(Modifier.padding(start = 6.dp, top = 10.dp)) { content() }
        }
    }
}

@Composable
private fun WayCard(label: String, detail: String, selected: Boolean, onClick: () -> Unit) {
    ChoiceCard(selected, onClick) {
        Text(label, fontWeight = FontWeight.Bold)
        Text(detail, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

/** One extra: checkbox, name · price, the one-line description, and a quantity stepper for per-item extras. */
@Composable
private fun FounderRow(c: FounderChoice, on: Boolean, onClick: () -> Unit) {
    Card(
        Modifier.fillMaxWidth().padding(bottom = 8.dp).selectable(selected = on, role = Role.RadioButton, onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = if (on) Color(0xFFFFF7E6) else MaterialTheme.colorScheme.surface),
        border = androidx.compose.foundation.BorderStroke(if (on) 2.dp else 1.dp, if (on) Orange else MaterialTheme.colorScheme.outline),
    ) {
        Row(Modifier.padding(start = 4.dp, end = 12.dp, top = 6.dp, bottom = 6.dp), verticalAlignment = Alignment.Top) {
            RadioButton(selected = on, onClick = null, modifier = Modifier.padding(top = 4.dp))
            Column(Modifier.weight(1f).padding(top = 10.dp, bottom = 6.dp)) {
                Row { Text(c.name, fontWeight = FontWeight.Bold); Text(" · ${c.price} → free") }
                if (c.about.isNotBlank()) Text(c.about, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun ExtraRow(a: AddonInfo, qty: Int?, included: String? = null, onChange: (Int?) -> Unit) {
    val on = qty != null
    Card(
        Modifier.fillMaxWidth().padding(bottom = 8.dp).selectable(selected = on, role = Role.Checkbox, onClick = { onChange(if (on) null else 1) }),
        colors = CardDefaults.cardColors(containerColor = if (on) Color(0xFFFFF7E6) else MaterialTheme.colorScheme.surface),
        border = androidx.compose.foundation.BorderStroke(if (on) 2.dp else 1.dp, if (on) Orange else MaterialTheme.colorScheme.outline),
    ) {
        Row(Modifier.padding(start = 4.dp, end = 12.dp, top = 6.dp, bottom = 6.dp), verticalAlignment = Alignment.Top) {
            Checkbox(checked = on, onCheckedChange = null, modifier = Modifier.padding(top = 4.dp))
            Column(Modifier.weight(1f).padding(top = 10.dp, bottom = 6.dp)) {
                Row { Text(a.name, fontWeight = FontWeight.Bold); Text(" · ${if (included != null) "included with $included" else a.price}") }
                if (a.about.isNotBlank()) Text(a.about, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (a.unit == "quote") Text("We'll call you with a price.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (on && a.unit == "each") {
                    val q = qty ?: 1
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 6.dp)) {
                        Text("How many", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(end = 8.dp))
                        OutlinedButton(onClick = { onChange(max(1, q - 1)) }, enabled = q > 1, contentPadding = PaddingValues(0.dp), modifier = Modifier.width(44.dp).height(40.dp)) { Text("−", style = MaterialTheme.typography.titleMedium) }
                        Text("$q", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(horizontal = 14.dp))
                        OutlinedButton(onClick = { onChange(min(MAX_QTY, q + 1)) }, enabled = q < MAX_QTY, contentPadding = PaddingValues(0.dp), modifier = Modifier.width(44.dp).height(40.dp)) { Icon(Icons.Default.Add, "More") }
                    }
                }
            }
        }
    }
}

/** The full-screen agreement: the sections for exactly what was picked, then the signature pad, consent and Sign. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AgreementDialog(
    state: AppState,
    leadId: String,
    plan: String,
    billing: String,
    picks: List<ExtraPick>,
    signerLine: String,
    detailsOk: Boolean,
    strokes: SnapshotStateList<List<Offset>>,
    onPadSize: (IntSize) -> Unit,
    consent: Boolean,
    onConsent: (Boolean) -> Unit,
    inked: Boolean,
    signing: Boolean,
    onSign: () -> Unit,
    onClose: () -> Unit,
) {
    var doc by remember { mutableStateOf<ContractDoc?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    val key = "$plan|$billing|${picksParam(picks)}"
    LaunchedEffect(key) {
        doc = null
        error = null
        try { doc = state.api.contractJson(leadId, plan, billing, picks) } catch (e: Api.Unauthorized) { state.signOut() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { error = e.message ?: "Couldn't load the agreement" }
    }
    Dialog(onDismissRequest = onClose, properties = DialogProperties(usePlatformDefaultWidth = false, dismissOnClickOutside = false)) {
        Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
            Scaffold(
                containerColor = MaterialTheme.colorScheme.background,
                topBar = {
                    TopAppBar(
                        title = { Text(doc?.title ?: "Your agreement", maxLines = 1) },
                        navigationIcon = { IconButton(onClick = onClose) { Icon(Icons.Default.Close, "Close") } },
                    )
                },
            ) { pad ->
                val d = doc
                LazyColumn(Modifier.fillMaxSize().padding(pad), contentPadding = PaddingValues(16.dp)) {
                    if (d == null) item {
                        if (error != null) Text(error ?: "", color = MaterialTheme.colorScheme.error) else Box(Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                    }
                    if (d != null) items(d.sections) { sec ->
                        if (sec.heading.isNotBlank()) Text(sec.heading, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 12.dp, bottom = 4.dp))
                        Text(sec.text, style = MaterialTheme.typography.bodyMedium)
                        HorizontalDivider(Modifier.padding(top = 10.dp))
                    }
                    item {
                        Card(Modifier.fillMaxWidth().padding(top = 16.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                            Column(Modifier.padding(14.dp)) {
                                Text("Sign here", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                if (signerLine.isNotBlank()) Text("Signing as $signerLine", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 2.dp))
                                if (!detailsOk) Text("Close this and fill in the business name, your full name and email first.", color = Warn, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 6.dp))
                                SignaturePad(strokes, onPadSize, Modifier.fillMaxWidth().height(170.dp).padding(top = 10.dp))
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                                    TextButton(onClick = { strokes.clear() }, enabled = strokes.isNotEmpty()) { Text("Clear") }
                                }
                                Row(Modifier.fillMaxWidth().selectable(selected = consent, role = Role.Checkbox, onClick = { onConsent(!consent) }).padding(vertical = 6.dp), verticalAlignment = Alignment.Top) {
                                    Checkbox(checked = consent, onCheckedChange = null)
                                    Text(CONSENT, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(start = 6.dp, top = 12.dp))
                                }
                                Button(
                                    onClick = onSign,
                                    enabled = d != null && detailsOk && inked && consent && !signing,
                                    modifier = Modifier.fillMaxWidth().padding(top = 10.dp).height(52.dp),
                                ) { Text(if (signing) "Saving…" else "Sign and continue") }
                                if (!inked || !consent) Text(
                                    if (!inked) "Draw your signature in the box to continue." else "Tick the box to continue.",
                                    style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 6.dp),
                                )
                                Spacer(Modifier.height(24.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}

/** A white box with a dashed border that records finger strokes (in its own pixels; the export rescales them). */
@Composable
private fun SignaturePad(strokes: SnapshotStateList<List<Offset>>, onSize: (IntSize) -> Unit, modifier: Modifier = Modifier) {
    var current by remember { mutableStateOf<List<Offset>>(emptyList()) }
    val shape = RoundedCornerShape(10.dp)
    Canvas(
        modifier
            .background(Color.White, shape)
            .clipToBounds()
            .onSizeChanged(onSize)
            .pointerInput(Unit) {
                detectTapGestures { p -> strokes.add(listOf(p, Offset(p.x + 0.5f, p.y))) }
            }
            .pointerInput(Unit) {
                // A finger that slides out of the box lifts the pen; it draws again once it is back inside.
                fun inBox(p: Offset) = p.x >= 0f && p.y >= 0f && p.x <= size.width && p.y <= size.height
                detectDragGestures(
                    onDragStart = { p -> current = if (inBox(p)) listOf(p) else emptyList() },
                    onDrag = { change, _ ->
                        change.consume()
                        val p = change.position
                        if (inBox(p)) current = current + p
                        else if (current.isNotEmpty()) { if (current.size > 1) strokes.add(current); current = emptyList() }
                    },
                    onDragEnd = { if (current.isNotEmpty()) strokes.add(current); current = emptyList() },
                    onDragCancel = { if (current.isNotEmpty()) strokes.add(current); current = emptyList() },
                )
            },
    ) {
        drawRoundRect(
            color = Color(0xFF3B4A6B),
            cornerRadius = CornerRadius(10.dp.toPx()),
            style = Stroke(width = 2.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(14f, 10f))),
        )
        val stroke = Stroke(width = 3.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round)
        for (s in strokes + listOf(current)) {
            if (s.isEmpty()) continue
            if (s.size == 1) { drawCircle(Color.Black, radius = 1.5.dp.toPx(), center = s[0]); continue }
            val path = Path()
            path.moveTo(s[0].x, s[0].y)
            for (k in 1 until s.size) path.lineTo(s[k].x, s[k].y)
            drawPath(path, Color.Black, style = stroke)
        }
    }
}

/**
 * The signature as the server wants it: a PNG data URL of a 600×200 white bitmap with the strokes in black, between
 * 2,000 and 200,000 characters. Strokes are scaled uniformly from the pad and centered. A short signature compresses
 * below the minimum, so a sprinkle of invisible near-white pixels is added until it clears it.
 */
private fun signaturePng(strokes: List<List<Offset>>, padW: Int, padH: Int): String {
    val w = 600
    val h = 200
    val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
    val canvas = android.graphics.Canvas(bmp)
    canvas.drawColor(android.graphics.Color.WHITE)
    val scale = min(w.toFloat() / max(1, padW), h.toFloat() / max(1, padH))
    val dx = (w - padW * scale) / 2f
    val dy = (h - padH * scale) / 2f
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.BLACK
        style = Paint.Style.STROKE
        strokeWidth = max(2.5f, 6f * scale)
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
    }
    for (s in strokes) {
        if (s.isEmpty()) continue
        if (s.size == 1) {
            canvas.drawCircle(s[0].x * scale + dx, s[0].y * scale + dy, paint.strokeWidth / 2, Paint(paint).apply { style = Paint.Style.FILL })
            continue
        }
        val path = android.graphics.Path()
        path.moveTo(s[0].x * scale + dx, s[0].y * scale + dy)
        for (k in 1 until s.size) path.lineTo(s[k].x * scale + dx, s[k].y * scale + dy)
        canvas.drawPath(path, paint)
    }
    var out = pngDataUrl(bmp)
    val rnd = Random(7)
    var rounds = 0
    while (out.length < 2_000 && rounds++ < 8) {
        repeat(500) {
            val x = rnd.nextInt(w)
            val y = rnd.nextInt(h)
            if (bmp.getPixel(x, y) == android.graphics.Color.WHITE) bmp.setPixel(x, y, android.graphics.Color.rgb(254, 254, 254))
        }
        out = pngDataUrl(bmp)
    }
    return out
}

private fun pngDataUrl(bmp: Bitmap): String {
    val bytes = ByteArrayOutputStream()
    bmp.compress(Bitmap.CompressFormat.PNG, 100, bytes)
    return "data:image/png;base64," + Base64.encodeToString(bytes.toByteArray(), Base64.NO_WRAP)
}

/** After signing: the order, how to pay right now, the signed agreement and what happens next. */
@Composable
private fun ResultCard(
    pad: PaddingValues,
    result: SignupResult,
    firstName: String,
    business: String,
    plan: PlanOffer,
    options: PlanOptions,
    billing: String,
    picks: List<ExtraPick>,
    email: String,
    company: String,
    paidText: String?,
    payNote: String?,
    payBusy: Boolean,
    onTap: () -> Unit,
    onCard: () -> Unit,
    onText: () -> Unit,
    onAgreement: () -> Unit,
    onDone: () -> Unit,
) {
    val way = if (result.invoice) "Pay by check or bank transfer" else (plan.options.firstOrNull { it.id == billing } ?: plan.options.firstOrNull { it.id == "standard" })?.label ?: ""
    LazyColumn(Modifier.fillMaxSize().padding(pad), contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item {
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp)) {
                    Text("Thank you, ${firstName.ifBlank { "and welcome" }}!", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    Text("You're signed up for $business.", color = Good, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 4.dp))
                    HorizontalDivider(Modifier.padding(vertical = 10.dp))
                    Text("${plan.name} website plan${if (way.isNotBlank()) " · $way" else ""}", fontWeight = FontWeight.SemiBold)
                    picks.forEach { pk ->
                        val a = options.addons.getOrNull(pk.index) ?: return@forEach
                        Text("+ ${a.name}${if (a.unit == "each" && pk.qty > 1) " ×${pk.qty}" else ""}${if (a.unit == "quote") " (we'll call you with a price)" else " · ${a.price}"}", style = MaterialTheme.typography.bodyMedium)
                    }
                    Text("${if (result.invoice) "On your first invoice" else "Due today"}: ${money(result.dueCents)}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 8.dp))
                    if (result.renewsCents != null && result.renewsCents > 0) Text("then ${money(result.renewsCents)} a ${result.renewsInterval ?: "month"}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
        item {
            Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = if (paidText != null) Color(0xFFE6F4EA) else MaterialTheme.colorScheme.surface)) {
                Column(Modifier.padding(16.dp)) {
                    when {
                        paidText != null -> Text(paidText, color = Good, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        result.invoice -> Text("We'll email an invoice to $email; nothing is charged online. Pay it by check or bank transfer.", style = MaterialTheme.typography.bodyLarge)
                        else -> {
                            val onPhone = result.tapReady || result.cardReady
                            Text(if (onPhone) "Last step: hand the phone back to $company to take the payment." else "Last step: payment.", fontWeight = FontWeight.SemiBold)
                            if (result.tapReady) Button(onClick = onTap, enabled = !payBusy, modifier = Modifier.fillMaxWidth().padding(top = 10.dp).height(52.dp)) { Text("💳 Tap card on this phone") }
                            if (result.cardReady) {
                                if (result.tapReady) OutlinedButton(onClick = onCard, enabled = !payBusy, modifier = Modifier.fillMaxWidth().padding(top = 8.dp).height(52.dp)) { Text("Enter card on this phone") }
                                else Button(onClick = onCard, enabled = !payBusy, modifier = Modifier.fillMaxWidth().padding(top = 10.dp).height(52.dp)) { Text("Enter card on this phone") }
                            }
                            if (result.checkoutUrl != null) {
                                if (onPhone) TextButton(onClick = onText, modifier = Modifier.fillMaxWidth().padding(top = 4.dp)) { Text("Text them the payment link") }
                                else Button(onClick = onText, modifier = Modifier.fillMaxWidth().padding(top = 10.dp).height(52.dp)) { Text("Text them the payment link") }
                            }
                            if (!onPhone && result.checkoutUrl == null) Text("We'll send an invoice shortly.", modifier = Modifier.padding(top = 6.dp))
                        }
                    }
                    if (payNote != null && paidText == null) Text(payNote, style = MaterialTheme.typography.bodyMedium, color = if (payBusy) MaterialTheme.colorScheme.onSurfaceVariant else Warn, modifier = Modifier.padding(top = 8.dp))
                    if (payBusy) Row(Modifier.padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically) { CircularProgressIndicator(Modifier.width(20.dp).height(20.dp), strokeWidth = 2.dp); Text("One moment…", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(start = 8.dp)) }
                }
            }
        }
        item {
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp)) {
                    TextButton(onClick = onAgreement, contentPadding = PaddingValues(0.dp)) { Text("📄 View the signed agreement") }
                    Text(GO_LIVE, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 6.dp))
                    Text("Next, we'll go over your photos, hours and details with you before anything goes live.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 8.dp))
                    Button(onClick = onDone, modifier = Modifier.fillMaxWidth().padding(top = 14.dp).height(52.dp)) { Text("Done") }
                }
            }
        }
    }
}
