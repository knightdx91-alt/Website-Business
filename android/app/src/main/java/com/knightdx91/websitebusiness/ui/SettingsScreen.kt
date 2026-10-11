package com.knightdx91.websitebusiness.ui

import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Environment
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshots.SnapshotStateList
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import androidx.navigation.NavHostController
import com.knightdx91.websitebusiness.AppState
import com.knightdx91.websitebusiness.BuildConfig
import com.knightdx91.websitebusiness.net.Api
import com.knightdx91.websitebusiness.net.Caller
import com.knightdx91.websitebusiness.net.SettingsMeta
import com.knightdx91.websitebusiness.net.TapStatus
import com.knightdx91.websitebusiness.net.Usage
import com.knightdx91.websitebusiness.net.addCaller
import com.knightdx91.websitebusiness.net.backup
import com.knightdx91.websitebusiness.net.callers
import com.knightdx91.websitebusiness.net.mailTest
import com.knightdx91.websitebusiness.net.objects
import com.knightdx91.websitebusiness.net.removeCaller
import com.knightdx91.websitebusiness.net.saveSettings
import com.knightdx91.websitebusiness.net.settingsMeta
import com.knightdx91.websitebusiness.net.str
import com.knightdx91.websitebusiness.net.updateCaller
import com.knightdx91.websitebusiness.net.usage
import com.knightdx91.websitebusiness.update.Updater
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.URLEncoder
import java.util.Locale

/* ---------- the form (mirrors viewSettings() in app/public/app.js, field for field) ---------- */

private val PLAN_IDS = listOf("basic", "plus", "pro", "list")

private data class SuggestedPlan(val id: String, val name: String, val setup: Double, val monthly: Double, val includes: String)

// Same starting plans as the web app (priced from market research, Oct 2026).
private val SUGGESTED_PLANS = listOf(
    SuggestedPlan("basic", "Basic", 0.0, 49.0, "Your website on fast, secure hosting\nSmall text, hours and photo updates\nTap-to-call and directions on every page"),
    SuggestedPlan("plus", "Plus", 0.0, 89.0, "Everything in Basic\nMonthly visitor report by text\nGoogle Business Profile tune-up\nGoogle review QR cards for your counter"),
    SuggestedPlan("pro", "Pro", 0.0, 149.0, "Everything in Plus\nMonthly Google profile posts and photo updates\nYour own domain name\nBusiness email (info@yourbusiness.com): free forwarding to the email you already use, or a full Google mailbox we set up, billed to you by Google\nPriority changes"),
    SuggestedPlan("list", "Price list", 0.0, 29.0, "A live price page for your shop, with a section for every tank or shelf\nThe Tank board: change names, prices, counts and photos from your phone, any time, no login\nSold out hides an item until it's back; the page shows how many are left\nQR price tags for every tank or shelf (first sheet included) and a tablet display page\nFast, secure hosting; changes when you text us\nNo minimum: cancel any time. Upgrade to a full website any time"),
)

private val UNIT_OPTIONS = listOf("month" to "per month", "each" to "each", "one-time" to "one-time", "quote" to "quote per job")

private val BILLING_LABELS = mapOf("standard" to "-month plan", "short" to "-month plan", "flex" to "Month to month", "annual" to "Pay yearly", "invoice" to "Pay by invoice (churches)")

/** A problem the owner has to fix before the settings can be sent (same checks the web form does). */
private class FormError(message: String) : Exception(message)

private fun numText(d: Double): String = if (d == Math.floor(d) && !d.isInfinite()) d.toLong().toString() else d.toString()

/** A saved number as the web form shows it (15, not 15.0); `default` when it isn't set. */
private fun numText(j: JSONObject, key: String, default: String): String {
    if (j.isNull(key)) return default
    val d = j.optDouble(key, Double.NaN)
    return if (d.isNaN()) default else numText(d)
}

/** Truthy the way the web filter reads a saved number: set and not 0. */
private fun truthy(j: JSONObject, key: String): Boolean = !j.isNull(key) && j.optDouble(key, 0.0) != 0.0

/** Blank → null (left out of the JSON, like `undefined`); a number → Long or Double; anything else is an error. */
private fun numOrNull(text: String, label: String): Number? {
    val t = text.trim()
    if (t.isEmpty()) return null
    val d = t.toDoubleOrNull() ?: throw FormError("“$label” needs a number")
    return if (d == Math.floor(d) && Math.abs(d) < 1e15) d.toLong() else d
}

private fun numOrZero(text: String, label: String): Number = numOrNull(text, label) ?: 0L

private fun JSONObject.txt(key: String): String = str(key) ?: ""

private var nextRowKey = 1

private class PlanForm(val id: String, name: String, setup: String, monthly: String, includes: String, pay: String, payShort: String, payFlex: String, payAnnual: String) {
    var name by mutableStateOf(name)
    var setup by mutableStateOf(setup)
    var monthly by mutableStateOf(monthly)
    var includes by mutableStateOf(includes)
    var pay by mutableStateOf(pay)
    var payShort by mutableStateOf(payShort)
    var payFlex by mutableStateOf(payFlex)
    var payAnnual by mutableStateOf(payAnnual)
    var moreLinks by mutableStateOf(payShort.isNotBlank() || payFlex.isNotBlank() || payAnnual.isNotBlank())
    val legend get() = when (id) { "basic" -> "Plan 1"; "plus" -> "Plan 2 (recommended)"; else -> "Plan 3" }
}

private class AddonForm(name: String, price: String, unit: String, about: String, terms: String) {
    val key = nextRowKey++
    var name by mutableStateOf(name)
    var price by mutableStateOf(price)
    var unit by mutableStateOf(unit)
    var about by mutableStateOf(about)
    var terms by mutableStateOf(terms)
    var showTerms by mutableStateOf(false)
}

/** Every editable setting, filled from `GET /api/meta` → settings exactly as the web form fills its inputs. */
private class SettingsForm(s: JSONObject, extraTerms: List<String>, defaultTerms: String) {
    var companyName by mutableStateOf(s.txt("companyName"))
    var legalName by mutableStateOf(s.txt("legalName"))
    var companyPhone by mutableStateOf(s.txt("companyPhone"))
    var companyEmail by mutableStateOf(s.txt("companyEmail"))
    var companyStreet by mutableStateOf(s.txt("companyStreet"))
    var companyCity by mutableStateOf(s.txt("companyCity"))
    var companyState by mutableStateOf(s.str("companyState") ?: "AL")
    var companyZip by mutableStateOf(s.txt("companyZip"))
    var companyReviewUrl by mutableStateOf(s.txt("companyReviewUrl"))
    var companyFacebookUrl by mutableStateOf(s.txt("companyFacebookUrl"))
    var calendarEmail by mutableStateOf(s.txt("calendarEmail"))
    var gaMeasurementId by mutableStateOf(s.txt("gaMeasurementId"))
    var directEmail by mutableStateOf(s.txt("directEmail"))
    var siteHeadline by mutableStateOf(s.txt("siteHeadline"))
    var siteLead by mutableStateOf(s.txt("siteLead"))
    var siteBio by mutableStateOf(s.txt("siteBio"))
    var siteTestimonials by mutableStateOf(s.txt("siteTestimonials"))
    var siteTowns by mutableStateOf(s.txt("siteTowns"))
    var gbpEmail by mutableStateOf(s.txt("gbpEmail"))
    var callerName by mutableStateOf(s.txt("callerName"))
    var googleClientId by mutableStateOf(s.txt("googleClientId"))
    var googleDomain by mutableStateOf(s.str("googleDomain") ?: "undergroundassociates.com")
    var ownerEmail by mutableStateOf(s.txt("ownerEmail"))
    var requireGoogle by mutableStateOf(s.optBoolean("requireGoogle"))
    var fcmAppId by mutableStateOf(s.txt("fcmAppId"))
    var fcmApiKey by mutableStateOf(s.txt("fcmApiKey"))
    var fcmProjectId by mutableStateOf(s.txt("fcmProjectId"))
    var fcmSenderId by mutableStateOf(s.txt("fcmSenderId"))
    val plans: List<PlanForm>
    var shortMonths by mutableStateOf(numText(s, "shortMonths", "6"))
    var minMonths by mutableStateOf(numText(s, "minMonths", "12"))
    var flexSetup by mutableStateOf(numText(s, "flexSetup", "299"))
    var annualMonthsFree by mutableStateOf(numText(s, "annualMonthsFree", "2"))
    var churchAnnualMonthsFree by mutableStateOf(numText(s, "churchAnnualMonthsFree", "4"))
    var invoiceForAll by mutableStateOf(if (s.isNull("invoiceForAll")) true else s.optBoolean("invoiceForAll", true))
    var lateFee by mutableStateOf(numText(s, "lateFee", "15"))
    var payoffDiscount by mutableStateOf(numText(s, "payoffDiscount", "15"))
    var interestRate by mutableStateOf(numText(s, "interestRate", "8"))
    var reinstatementFee by mutableStateOf(numText(s, "reinstatementFee", "49"))
    var returnedPaymentFee by mutableStateOf(numText(s, "returnedPaymentFee", "15"))
    val addons: SnapshotStateList<AddonForm> = mutableStateListOf()
    var dailyCalls by mutableStateOf(numText(s, "dailyCalls", ""))
    var commission by mutableStateOf(numText(s, "commission", ""))
    var terms by mutableStateOf(s.txt("terms").ifEmpty { defaultTerms })
    var cap by mutableStateOf(numText(s, "defaultCap", "50"))
    var model by mutableStateOf(s.txt("copyModel"))
    val hadPlans: Boolean

    init {
        val saved = s.optJSONArray("plans").objects()
        hadPlans = saved.isNotEmpty()
        plans = if (!hadPlans) SUGGESTED_PLANS.map { PlanForm(it.id, it.name, numText(it.setup), numText(it.monthly), it.includes, "", "", "", "") }
        else PLAN_IDS.map { id ->
            val p = saved.firstOrNull { it.optString("id") == id }
            if (p == null) PlanForm(id, "", "0", "", "", "", "", "", "")
            else PlanForm(id, p.txt("name"), numText(p, "setup", "0"), numText(p, "monthly", ""), p.txt("includes"), p.txt("payLink"), p.txt("payLinkShort"), p.txt("payLinkFlex"), p.txt("payLinkAnnual"))
        }
        // Existing extras show their own terms, else the standard terms for that extra (the web textarea does the same, so saving keeps them).
        s.optJSONArray("addons").objects().forEachIndexed { i, a ->
            addons.add(AddonForm(a.txt("name"), numText(a, "price", ""), a.str("unit") ?: "one-time", a.txt("about"), a.str("terms") ?: extraTerms.getOrNull(i) ?: ""))
        }
    }

    /** The PUT /api/settings body, built the way the web save handler builds it. Throws FormError for what the web toasts. */
    fun body(meta: SettingsMeta, showsCallerName: Boolean): JSONObject {
        val b = JSONObject()
        val capN = cap.trim().toIntOrNull() ?: throw FormError("“Default most sites per run” needs a whole number")
        if (capN < 1 || capN > 500) throw FormError("Default most sites per run: 1 to 500")
        b.put("defaultCap", capN)
        if (model.isBlank()) throw FormError("Pick an AI writer")
        b.put("copyModel", model)
        fun putStr(key: String, v: String, transform: (String) -> String = { it }) {
            val t = transform(v.trim())
            if (t.isNotEmpty()) b.put(key, t)
        }
        putStr("companyName", companyName)
        putStr("legalName", legalName)
        putStr("companyPhone", companyPhone)
        putStr("companyEmail", companyEmail)
        putStr("googleClientId", googleClientId)
        putStr("googleDomain", googleDomain) { it.lowercase(Locale.US) }
        putStr("ownerEmail", ownerEmail) { it.lowercase(Locale.US) }
        b.put("requireGoogle", requireGoogle)
        putStr("fcmAppId", fcmAppId); putStr("fcmApiKey", fcmApiKey); putStr("fcmProjectId", fcmProjectId); putStr("fcmSenderId", fcmSenderId)
        putStr("companyStreet", companyStreet)
        putStr("companyCity", companyCity)
        putStr("companyState", companyState) { it.uppercase(Locale.US) }
        putStr("companyZip", companyZip)
        putStr("directEmail", directEmail)
        putStr("companyReviewUrl", companyReviewUrl)
        putStr("siteHeadline", siteHeadline)
        putStr("siteLead", siteLead)
        putStr("siteBio", siteBio)
        putStr("siteTestimonials", siteTestimonials)
        putStr("siteTowns", siteTowns)
        putStr("companyFacebookUrl", companyFacebookUrl)
        putStr("gaMeasurementId", gaMeasurementId) { it.uppercase(Locale.US) }
        putStr("calendarEmail", calendarEmail)
        putStr("gbpEmail", gbpEmail)
        // Only the owner's own login shows this field; others keep the owner's name as it is.
        if (showsCallerName) putStr("callerName", callerName) else meta.settings.str("callerName")?.let { b.put("callerName", it) }
        val plansArr = JSONArray()
        for (p in plans) {
            val name = p.name.trim()
            if (name.isEmpty()) continue
            val monthly = numOrZero(p.monthly, "${p.legend} monthly")
            if (monthly.toDouble() == 0.0) throw FormError("Give every plan a monthly price")
            val o = JSONObject().put("id", p.id).put("name", name).put("setup", numOrZero(p.setup, "${p.legend} setup")).put("monthly", monthly).put("includes", p.includes.trim())
            fun putLink(key: String, v: String) { if (v.isNotBlank()) o.put(key, v.trim()) }
            putLink("payLink", p.pay)
            putLink("payLinkFlex", p.payFlex)
            putLink("payLinkAnnual", p.payAnnual)
            putLink("payLinkShort", p.payShort)
            plansArr.put(o)
        }
        b.put("plans", plansArr)
        fun putNum(key: String, v: String, label: String) { numOrNull(v, label)?.let { b.put(key, it) } }
        putNum("minMonths", minMonths, "Standard plan (months)")
        putNum("shortMonths", shortMonths, "Short plan (months)")
        putNum("flexSetup", flexSetup, "Month-to-month setup")
        putNum("lateFee", lateFee, "Late fee")
        putNum("payoffDiscount", payoffDiscount, "Early payoff discount")
        putNum("interestRate", interestRate, "Interest on overdue balances")
        putNum("reinstatementFee", reinstatementFee, "Reinstatement fee")
        putNum("returnedPaymentFee", returnedPaymentFee, "Returned payment / dispute fee")
        b.put("invoiceForAll", invoiceForAll)
        putNum("annualMonthsFree", annualMonthsFree, "Yearly: months free")
        putNum("churchAnnualMonthsFree", churchAnnualMonthsFree, "Churches & nonprofits: yearly months free")
        putNum("dailyCalls", dailyCalls, "Daily call goal")
        val addonsArr = JSONArray()
        for (a in addons) {
            val name = a.name.trim()
            if (name.isEmpty()) continue
            val o = JSONObject().put("name", name).put("price", numOrZero(a.price, "$name price")).put("unit", a.unit)
            if (a.about.isNotBlank()) o.put("about", a.about.trim())
            if (a.terms.isNotBlank()) o.put("terms", a.terms.trim())
            addonsArr.put(o)
        }
        b.put("addons", addonsArr)
        putNum("commission", commission, "Commission per sale")
        val t = terms.trim()
        if (t.isNotEmpty() && t != meta.defaultTerms) b.put("terms", t)
        return b
    }
}

private sealed class Dlg {
    data class Email(val c: Caller) : Dlg()
    data class Password(val c: Caller) : Dlg()
    data class Admin(val c: Caller) : Dlg()
    data class Off(val c: Caller) : Dlg()
    data class Remove(val c: Caller) : Dlg()
    object ResetTerms : Dlg()
}

/* ---------- the screen ---------- */

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun SettingsScreen(state: AppState, nav: NavHostController) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val meta = state.meta
    val prefs = state.api.prefs
    val isOwner = meta?.isOwner == true
    var tap by remember { mutableStateOf<TapStatus?>(null) }
    var update by remember { mutableStateOf<Updater.Check?>(null) }
    var updateMsg by remember { mutableStateOf("") }
    var progress by remember { mutableStateOf<Float?>(null) }

    var sm by remember { mutableStateOf<SettingsMeta?>(null) }
    var form by remember { mutableStateOf<SettingsForm?>(null) }
    var callers by remember { mutableStateOf<List<Caller>>(emptyList()) }
    var usage by remember { mutableStateOf<Usage?>(null) }
    var loadError by remember { mutableStateOf("") }
    var saving by remember { mutableStateOf(false) }
    var dialog by remember { mutableStateOf<Dlg?>(null) }
    var mailOut by remember { mutableStateOf("") }
    var mailBusy by remember { mutableStateOf(false) }
    var prevPlan by remember { mutableStateOf("plus") }
    var prevBilling by remember { mutableStateOf("standard") }
    var backupBusy by remember { mutableStateOf(false) }

    suspend fun loadOwner() {
        loadError = ""
        try {
            val m = state.api.settingsMeta()
            val f = SettingsForm(m.settings, m.extraTerms, m.defaultTerms)
            sm = m
            form = f
            val planIds = m.settings.optJSONArray("plans").objects().filter { it.optDouble("monthly", 0.0) > 0 }.map { it.optString("id") }
            if (prevPlan !in planIds) prevPlan = if ("plus" in planIds) "plus" else planIds.firstOrNull() ?: "plus"
            callers = state.api.callers()
            usage = runCatching { state.api.usage() }.getOrNull()
        } catch (e: Api.Unauthorized) { state.signOut() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { loadError = e.message ?: "Couldn't load settings" }
    }

    suspend fun reloadCallers() {
        try { callers = state.api.callers() } catch (e: Api.Unauthorized) { state.signOut() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { context.toast(e.message ?: "Couldn't load the team") }
    }

    LaunchedEffect(Unit) {
        state.refreshMeta()
        if (state.meta?.isOwner == true) {
            runCatching { tap = state.api.tapStatus() }
            loadOwner()
        }
        update = runCatching { Updater.check(state.api) }.getOrNull()
    }

    fun install() {
        val u = update ?: return
        scope.launch {
            try {
                progress = -1f
                updateMsg = "Downloading ${u.versionName}…"
                Updater.downloadAndInstall(context, state.api, u) { read, total ->
                    progress = if (total > 0) (read.toFloat() / total).coerceIn(0f, 1f) else -1f
                    updateMsg = "Downloading ${u.versionName}… %.1f MB%s".format(read / 1_048_576.0, if (total > 0) " of %.1f MB".format(total / 1_048_576.0) else "")
                }
                updateMsg = "Downloaded. Android will ask you to install it."
            } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { updateMsg = e.message ?: "Update failed" } finally { progress = null }
        }
    }

    val showsCallerName = sm?.let { it.meId.isEmpty() || it.meId == "owner" } ?: true

    fun save() {
        val f = form ?: return
        val m = sm ?: return
        val body = try { f.body(m, showsCallerName) } catch (e: FormError) { return context.toast(e.message ?: "Check the form") }
        saving = true
        scope.launch {
            try {
                state.api.saveSettings(body)
                context.toast("Saved")
                state.refreshMeta()
                loadOwner()
            } catch (e: Api.Unauthorized) { state.signOut() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { context.toast(e.message ?: "Couldn't save") } finally { saving = false }
        }
    }

    fun callerAction(block: suspend () -> Unit) {
        scope.launch {
            try { block(); reloadCallers() } catch (e: Api.Unauthorized) { state.signOut() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { context.toast(e.message ?: "Couldn't change that") }
        }
    }

    fun sendTestMail() {
        mailBusy = true
        mailOut = "Sending…"
        scope.launch {
            try {
                val r = state.api.mailTest()
                mailOut = if (r.ok) "Sent to ${r.to ?: ""} through ${if (r.provider == "resend") "Resend" else "MailerSend"}. Check your inbox (and spam) in a minute." else "Failed: ${r.error ?: "unknown error"}"
            } catch (e: Api.Unauthorized) { state.signOut() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { mailOut = e.message ?: "Couldn't send" } finally { mailBusy = false }
        }
    }

    fun downloadBackup() {
        val token = prefs.token ?: return context.toast("Please sign in again")
        val name = "website-business-backup-${dayFromNow(0)}.json"
        try {
            val req = DownloadManager.Request(Uri.parse(state.api.origin + "/api/backup"))
                .addRequestHeader("Authorization", "Bearer $token")
                .setMimeType("application/json")
                .setTitle(name)
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name)
            (context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager).enqueue(req)
            context.toast("Downloading $name to Downloads")
        } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { context.toast("Couldn't start the download. Try “Share backup” instead.") }
    }

    fun shareBackup() {
        backupBusy = true
        scope.launch {
            try {
                val bytes = state.api.backup()
                val file = withContext(Dispatchers.IO) {
                    val dir = File(context.cacheDir, "share").apply { mkdirs() }
                    File(dir, "website-business-backup-${dayFromNow(0)}.json").also { it.writeBytes(bytes) }
                }
                val uri = FileProvider.getUriForFile(context, "${BuildConfig.APPLICATION_ID}.files", file)
                val send = Intent(Intent.ACTION_SEND).setType("application/json").putExtra(Intent.EXTRA_STREAM, uri).putExtra(Intent.EXTRA_SUBJECT, file.name).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                context.startActivity(Intent.createChooser(send, "Save the backup").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            } catch (e: Api.Unauthorized) { state.signOut() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { context.toast(e.message ?: "Couldn't fetch the backup") } finally { backupBusy = false }
        }
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Settings") }, actions = { if (isOwner && form != null) TextButton(onClick = { save() }, enabled = !saving) { Text("Save") } }) },
        bottomBar = {
            if (isOwner && form != null) Surface(tonalElevation = 3.dp) {
                Button(onClick = { save() }, enabled = !saving, modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp)) { Text(if (saving) "Saving…" else "Save settings") }
            }
        },
    ) { pad ->
        LazyColumn(Modifier.fillMaxSize().padding(pad), contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            item {
                CollapsibleCard("Signed in", defaultOpen = true) {
                    Text("${meta?.meName ?: prefs.name}${if (isOwner) " · full access" else " · caller"}${if (prefs.email.isNotBlank()) "\n${prefs.email}" else ""}")
                    OutlinedButton(onClick = { scope.launch { state.api.logout(); state.signOut() } }, modifier = Modifier.padding(top = 8.dp)) { Text("Sign out") }
                }
            }

            if (isOwner) {
                val f = form
                val m = sm
                if (f == null || m == null) item {
                    CollapsibleCard("Business settings") {
                        if (loadError.isNotBlank()) {
                            Text(loadError, color = Warn)
                            OutlinedButton(onClick = { scope.launch { loadOwner() } }, modifier = Modifier.padding(top = 6.dp)) { Text("Try again") }
                        } else {
                            Text("Loading…", color = MaterialTheme.colorScheme.onSurfaceVariant)
                            LinearProgressIndicator(Modifier.fillMaxWidth().padding(top = 8.dp))
                        }
                    }
                } else {
                    item { BusinessCard(f, showsCallerName) }
                    item { WebsiteCard(f) }
                    item { SignInCard(f) }
                    item { PushCard(f, m.fcmServer) }
                    item { PlansCard(f, m, mailOut, mailBusy) { sendTestMail() } }
                    item { WaysToPayCard(f) }
                    item { FeesCard(f) }
                    item { PreviewCard(m, prevPlan, { prevPlan = it }, prevBilling, { prevBilling = it }, nav) }
                    item { ExtrasCard(f) }
                    item { AgreementCard(f) { dialog = Dlg.ResetTerms } }
                    item { RunsCard(f, m) }
                    item {
                        Button(onClick = { save() }, enabled = !saving, modifier = Modifier.fillMaxWidth()) { Text(if (saving) "Saving…" else "Save settings") }
                    }
                    item { UsageCard(usage) }
                    item {
                        TeamCard(
                            callers = callers,
                            meId = m.meId,
                            domain = m.settings.str("googleDomain") ?: "undergroundassociates.com",
                            onEmail = { dialog = Dlg.Email(it) },
                            onPassword = { dialog = Dlg.Password(it) },
                            onAdmin = { c -> if (c.admin) callerAction { state.api.updateCaller(c.id, JSONObject().put("admin", false)) } else { dialog = Dlg.Admin(c) } },
                            onToggle = { c -> if (c.disabled) callerAction { state.api.updateCaller(c.id, JSONObject().put("disabled", false)) } else { dialog = Dlg.Off(c) } },
                            onRemove = { dialog = Dlg.Remove(it) },
                            onAdd = { name, email, password, admin ->
                                callerAction {
                                    state.api.addCaller(name, password, email, admin)
                                    context.toast(if (email.isNotBlank()) "Added. They sign in with Google." else "Added. They log in with that password.")
                                }
                            },
                        )
                    }
                    item {
                        CollapsibleCard("Backup") {
                            Text("A copy of your leads, notes, sign-ups and settings as a file. Keep it somewhere safe now and then.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 8.dp)) {
                                OutlinedButton(onClick = { downloadBackup() }) { Text("⬇️ Download backup") }
                                OutlinedButton(onClick = { shareBackup() }, enabled = !backupBusy) { Text(if (backupBusy) "Fetching…" else "Share backup…") }
                            }
                            Text("Download puts the file in your Downloads folder; Share lets you send it to Drive or another app.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 6.dp))
                        }
                    }
                }
            }

            item {
                CollapsibleCard("App version ${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})") {
                    val u = update
                    when {
                        u == null -> Text("Checking for updates…", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        u.versionCode > BuildConfig.VERSION_CODE -> {
                            Text("Update available: ${u.versionName} (${u.versionCode}).", color = Good)
                            Button(onClick = { install() }, enabled = progress == null, modifier = Modifier.padding(top = 6.dp)) { Text("Download and install") }
                        }
                        else -> Text("You're on the newest build. The app checks once a day and tells you when there's a new one.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    progress?.let { p -> if (p < 0f) LinearProgressIndicator(Modifier.fillMaxWidth().padding(top = 8.dp)) else LinearProgressIndicator(progress = { p }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) }
                    if (updateMsg.isNotBlank()) Text(updateMsg, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp))
                }
            }
            if (isOwner) item {
                CollapsibleCard("💳 Tap to Pay") {
                    Text("Take a client's card on your phone, in person: they sign on the sign-up page, then tap their card on the back of the phone. The card is saved in Stripe for the monthly or yearly renewals.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    val t = tap
                    when {
                        t == null -> Text("Checking…", color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 6.dp))
                        t.ready -> Text("Ready · ${t.address ?: ""}", color = Good, modifier = Modifier.padding(top = 6.dp))
                        else -> {
                            Text("Not ready: ${t.why ?: "Stripe isn't connected."}", modifier = Modifier.padding(top = 6.dp))
                            if (meta?.checkoutOnline == true) Button(onClick = { scope.launch { try { state.api.tapSetup(); tap = state.api.tapStatus(); state.refreshMeta(); context.toast("Tap to Pay is set up") } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { context.toast(e.message ?: "Couldn't set up") } } }, modifier = Modifier.padding(top = 6.dp)) { Text("Set up Tap to Pay") }
                        }
                    }
                    Text("Needs NFC and Location on, Developer options off, Android 13+. Fees 2.7% + 5¢ + 10¢ per tap; renewals on the saved card are online charges.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 6.dp))
                }
            }
            item {
                CollapsibleCard("More") {
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        OutlinedButton(onClick = { nav.navigate("playbook") }) { Text("💬 Plans & answers") }
                        OutlinedButton(onClick = { nav.navigate("training") }) { Text("🎓 Training") }
                        OutlinedButton(onClick = { nav.navigate("guide/tankboard") }) { Text("🐠 Tank board guide") }
                        OutlinedButton(onClick = { nav.navigate("guide/pricetags") }) { Text("🏷️ QR price tags guide") }
                        OutlinedButton(onClick = { nav.navigate("guide/display") }) { Text("📺 Tablet display guide") }
                        if (isOwner) OutlinedButton(onClick = { nav.navigate("costs") }) { Text("💵 Costs & usage") }
                        if (isOwner) OutlinedButton(onClick = { nav.navigate("guide/costs") }) { Text("📖 What keeps the app running") }
                        OutlinedButton(onClick = { nav.navigate("plans") }) { Text("📋 Show plans") }
                        OutlinedButton(onClick = { nav.navigate("walkin") }) { Text("🚶 In-person guide") }
                        if (isOwner) {
                            OutlinedButton(onClick = { nav.navigate("inbox") }) { Text("📥 Inbox") }
                            OutlinedButton(onClick = { nav.navigate("sales") }) { Text("📈 Sales") }
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(8.dp)) }
        }
    }

    when (val d = dialog) {
        null -> {}
        is Dlg.ResetTerms -> ConfirmDialog("Reset the agreement?", "Replace the agreement with the standard text?", "Replace", onDismiss = { dialog = null }) {
            sm?.let { form?.terms = it.defaultTerms }
            dialog = null
        }
        is Dlg.Email -> PromptDialog(
            title = if (d.c.email != null) "Change email" else "Add Google email",
            label = "Their company Google address (blank to remove)",
            initial = d.c.email ?: "",
            keyboard = KeyboardType.Email,
            onDismiss = { dialog = null },
        ) { v ->
            dialog = null
            callerAction { state.api.updateCaller(d.c.id, JSONObject().put("email", v.trim().ifBlank { null } ?: JSONObject.NULL)) }
        }
        is Dlg.Password -> PromptDialog(
            title = "New password for ${d.c.name}",
            label = "At least 8 characters. They'll be logged out everywhere.",
            initial = "",
            password = true,
            onDismiss = { dialog = null },
        ) { v ->
            if (v.isBlank()) return@PromptDialog
            dialog = null
            callerAction { state.api.updateCaller(d.c.id, JSONObject().put("password", v)); context.toast("Password changed") }
        }
        is Dlg.Admin -> ConfirmDialog("Give full access?", "Give full access? They'll be able to do everything you can, including settings and publishing.", "Give full access", onDismiss = { dialog = null }) {
            dialog = null
            callerAction { state.api.updateCaller(d.c.id, JSONObject().put("admin", true)) }
        }
        is Dlg.Off -> ConfirmDialog("Turn ${d.c.name} off?", "Turn this person off? They'll be logged out everywhere and can't log in until you turn them back on. Their notes stay.", "Turn off", onDismiss = { dialog = null }) {
            dialog = null
            callerAction { state.api.updateCaller(d.c.id, JSONObject().put("disabled", true)) }
        }
        is Dlg.Remove -> ConfirmDialog("Remove ${d.c.name}?", "Remove this person? Their notes stay.", "Remove", onDismiss = { dialog = null }) {
            dialog = null
            callerAction { state.api.removeCaller(d.c.id) }
        }
    }
}

/* ---------- cards ---------- */

@Composable
private fun Field(
    value: String,
    onChange: (String) -> Unit,
    label: String,
    hint: String? = null,
    placeholder: String? = null,
    keyboard: KeyboardType = KeyboardType.Text,
    caps: KeyboardCapitalization = KeyboardCapitalization.None,
    singleLine: Boolean = true,
    minLines: Int = 1,
    modifier: Modifier = Modifier,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onChange,
        label = { Text(label) },
        placeholder = placeholder?.let { { Text(it) } },
        supportingText = hint?.let { { Text(it) } },
        keyboardOptions = KeyboardOptions(keyboardType = keyboard, capitalization = caps),
        singleLine = singleLine,
        minLines = if (singleLine) 1 else minLines,
        modifier = modifier.fillMaxWidth().padding(top = 4.dp),
    )
}

@Composable
private fun CheckRow(checked: Boolean, onChange: (Boolean) -> Unit, text: String) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().padding(top = 4.dp)) {
        Checkbox(checked, onChange)
        Text(text, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
    }
}

@Composable
private fun Hint(text: String, modifier: Modifier = Modifier) {
    Text(text, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = modifier)
}

@Composable
private fun SubHead(text: String) {
    Text(text, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 12.dp))
}

/** Settings → Website: the copy undergroundassociates.com is rendered from (prices and extras come from Sales / Extras). */
@Composable
private fun WebsiteCard(f: SettingsForm) {
    CollapsibleCard("Website") {
        Text("undergroundassociates.com is built from these settings every time it loads. Blank fields use the standard wording.", style = MaterialTheme.typography.bodySmall)
        Field(f.siteHeadline, { f.siteHeadline = it.take(120) }, "Headline", hint = "The big line at the top. Standard: \"Your website is already built. See it before you pay a dime.\"", caps = KeyboardCapitalization.Sentences)
        Field(f.siteLead, { f.siteLead = it.take(400) }, "Lead line", hint = "The sentence or two under the headline. Blank writes it from your prices.", caps = KeyboardCapitalization.Sentences, singleLine = false, minLines = 3)
        Field(f.siteBio, { f.siteBio = it.take(1200) }, "About you", hint = "The paragraph next to your photo (\"Hi, I'm Post.\").", caps = KeyboardCapitalization.Sentences, singleLine = false, minLines = 4)
        Field(f.siteTestimonials, { f.siteTestimonials = it.take(3000) }, "Client quotes", hint = "One per line: Quote | Name, Business. Only real clients who said it.", caps = KeyboardCapitalization.Sentences, singleLine = false, minLines = 4)
        Field(f.siteTowns, { f.siteTowns = it.take(400) }, "Towns served", hint = "Comma-separated: the where-we-work page, the footer and what Google is told you serve.", placeholder = "Cullman, Hanceville, Good Hope, Vinemont", caps = KeyboardCapitalization.Words)
    }
}

@Composable
private fun BusinessCard(f: SettingsForm, showsCallerName: Boolean) {
    CollapsibleCard("Your business") {
        Field(f.companyName, { f.companyName = it }, "Company name", hint = "What clients see", placeholder = "e.g. Underground Associates", caps = KeyboardCapitalization.Words)
        Field(f.legalName, { f.legalName = it }, "Legal name", hint = "Who signs client agreements", placeholder = "e.g. Underground Associates LLC", caps = KeyboardCapitalization.Words)
        Field(f.companyPhone, { f.companyPhone = it }, "Business phone", keyboard = KeyboardType.Phone)
        Field(f.companyEmail, { f.companyEmail = it }, "Business email", hint = "Shown everywhere", keyboard = KeyboardType.Email)
        Field(f.companyStreet, { f.companyStreet = it }, "Business street address", hint = "Needed once for Tap to Pay (Stripe registers where in-person payments happen). Not shown to clients.", placeholder = "123 2nd Ave SW", caps = KeyboardCapitalization.Words)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Field(f.companyCity, { f.companyCity = it }, "City", placeholder = "Cullman", caps = KeyboardCapitalization.Words, modifier = Modifier.weight(2f))
            Field(f.companyState, { f.companyState = it.take(2) }, "State", caps = KeyboardCapitalization.Characters, modifier = Modifier.weight(1f))
            Field(f.companyZip, { f.companyZip = it }, "ZIP", placeholder = "35055", keyboard = KeyboardType.Number, modifier = Modifier.weight(1.4f))
        }
        Field(f.companyReviewUrl, { f.companyReviewUrl = it }, "Our Google review link", hint = "From your Google profile: “Ask for reviews” → copy link. Texted to happy clients.", placeholder = "https://g.page/r/…/review", keyboard = KeyboardType.Uri)
        Field(f.companyFacebookUrl, { f.companyFacebookUrl = it }, "Our Facebook page", hint = "Linked in the website footer", placeholder = "https://www.facebook.com/…", keyboard = KeyboardType.Uri)
        Field(f.calendarEmail, { f.calendarEmail = it }, "Calendar email", hint = "Tasks for you with a date are sent here as calendar invites (your Google Calendar address). Blank uses your direct email.", placeholder = "post@undergroundassociates.com", keyboard = KeyboardType.Email)
        Field(f.gaMeasurementId, { f.gaMeasurementId = it }, "Google tag ID", hint = "From Google Analytics / Ads, like G-XXXXXXXXXX. Added to every page of the company website; blank turns it off.", placeholder = "G-XXXXXXXXXX", caps = KeyboardCapitalization.Characters)
        Field(f.directEmail, { f.directEmail = it }, "Owner's direct email", hint = "Shown on your website as \"Need the owner directly?\"", placeholder = "post@undergroundassociates.com", keyboard = KeyboardType.Email)
        Field(f.gbpEmail, { f.gbpEmail = it }, "Google account for client profiles", hint = "Clients add this email as a Manager on their Google listing", placeholder = "yourbusiness@gmail.com", keyboard = KeyboardType.Email)
        if (showsCallerName) Field(f.callerName, { f.callerName = it }, "Your name", hint = "Your texts say \"Hi, this is ___ with ${f.companyName.ifBlank { "your company" }}\". Everyone else's texts use their own login names.", placeholder = "e.g. Post", caps = KeyboardCapitalization.Words)
    }
}

@Composable
private fun PushCard(f: SettingsForm, serverReady: Boolean) {
    CollapsibleCard("Phone alerts (Firebase)") {
        Hint("Instant pushes to every phone: a new app build and team alerts arrive within seconds instead of up to 15 minutes. One-time Firebase setup, then paste the four public values from Project settings → General (and Cloud Messaging for the sender ID). The service-account JSON goes in Cloudflare as the Worker secret FCM_SERVICE_ACCOUNT, never here.")
        Text(if (serverReady) "✅ Worker secret FCM_SERVICE_ACCOUNT is set" else "⚠️ Worker secret FCM_SERVICE_ACCOUNT not set yet: the server can't send pushes", style = MaterialTheme.typography.bodySmall, color = if (serverReady) Good else Warn)
        Field(f.fcmAppId, { f.fcmAppId = it }, "App ID", hint = "Looks like 1:123456789:android:0a1b2c…", placeholder = "1:…:android:…")
        Field(f.fcmApiKey, { f.fcmApiKey = it }, "Web API key", hint = "Starts with AIza. Public, not a secret.", placeholder = "AIza…")
        Field(f.fcmProjectId, { f.fcmProjectId = it }, "Project ID", placeholder = "underground-associates-1a2b3")
        Field(f.fcmSenderId, { f.fcmSenderId = it }, "Sender ID", hint = "Cloud Messaging tab: Sender ID (a number)", keyboard = KeyboardType.Number)
    }
}

@Composable
private fun SignInCard(f: SettingsForm) {
    CollapsibleCard("Team sign-in (Google)") {
        Hint("Everyone signs in with their company Google account. One-time setup in Google Cloud, then paste the web client ID here.")
        Field(f.googleClientId, { f.googleClientId = it }, "Google client ID", hint = "The OAuth “Web application” client, ends in .apps.googleusercontent.com", placeholder = "1234567890-abc.apps.googleusercontent.com")
        Field(f.googleDomain, { f.googleDomain = it }, "Company domain", keyboard = KeyboardType.Uri)
        Field(f.ownerEmail, { f.ownerEmail = it }, "Owner's Google address", hint = "This address signs in as the owner", placeholder = "post@undergroundassociates.com", keyboard = KeyboardType.Email)
        CheckRow(f.requireGoogle, { f.requireGoogle = it }, "Turn passwords off (Google only). Turn this on once your own Google sign-in works.")
    }
}

@Composable
private fun PlansCard(f: SettingsForm, m: SettingsMeta, mailOut: String, mailBusy: Boolean, onMailTest: () -> Unit) {
    CollapsibleCard("Plans & prices") {
        Card(Modifier.fillMaxWidth().padding(top = 8.dp)) {
            Column(Modifier.padding(10.dp)) {
                if (m.checkout.online) Text("✅ Online checkout is on. Sign-up links, “Buy now” on your website and “Buy extras” links all go to a Stripe checkout with exactly what the client picked. The payment links below aren't needed.", style = MaterialTheme.typography.bodySmall)
                else Text("Online checkout isn't on yet. Add your Stripe key as the Cloudflare secret STRIPE_SECRET_KEY and clients can pick a plan, way to pay and extras and pay in one checkout. Until then, the payment links below are used (plan only).", style = MaterialTheme.typography.bodySmall)
                if (!m.checkout.webhook) Text("⚠️ Payments won't mark clients Paid by themselves until the Stripe webhook secret (STRIPE_WEBHOOK_SECRET) is added.", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp))
                if (m.checkout.email) {
                    Text("✅ Automatic emails are on (clients who ask for extras on your website get their Buy extras link by email).", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp))
                    TextButton(onClick = onMailTest, enabled = !mailBusy, contentPadding = PaddingValues(0.dp)) { Text("Send me a test email") }
                    if (mailOut.isNotBlank()) Text(mailOut, style = MaterialTheme.typography.bodySmall)
                } else Text("Automatic emails are off. Add RESEND_API_KEY to email clients their Buy extras link when they ask on your website.", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp))
            }
        }
        Hint("${if (f.hadPlans) "" else "Suggested starting plans are filled in below. Change them to your prices, then Save. "}Leave a plan's name blank to hide it.", Modifier.padding(top = 8.dp))
        f.plans.forEach { p ->
            SubHead(p.legend)
            Field(p.name, { p.name = it }, "Name", caps = KeyboardCapitalization.Words)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Field(p.monthly, { p.monthly = it }, "Monthly (\$)", keyboard = KeyboardType.Decimal, modifier = Modifier.weight(1f))
                Field(p.setup, { p.setup = it }, "Setup (\$)", hint = "Keep 0; month to month adds its own fee", keyboard = KeyboardType.Decimal, modifier = Modifier.weight(1f))
            }
            Field(p.includes, { p.includes = it }, "What's included", hint = "One per line", singleLine = false, minLines = 3, caps = KeyboardCapitalization.Sentences)
            Field(p.pay, { p.pay = it }, "Monthly payment link", hint = "Monthly subscription, Stripe or Square. Used for 12-month and 6-month plans", placeholder = "https://buy.stripe.com/…", keyboard = KeyboardType.Uri)
            TextButton(onClick = { p.moreLinks = !p.moreLinks }, contentPadding = PaddingValues(0.dp)) { Text(if (p.moreLinks) "▾ Links for 6-month, month-to-month and yearly (optional)" else "▸ Links for 6-month, month-to-month and yearly (optional)") }
            if (p.moreLinks) {
                Field(p.payShort, { p.payShort = it }, "6-month plan link", hint = "Leave empty to use the 12-month link (same monthly price)", placeholder = "https://buy.stripe.com/…", keyboard = KeyboardType.Uri)
                Field(p.payFlex, { p.payFlex = it }, "Month-to-month link", hint = "Includes the extra setup fee", placeholder = "https://buy.stripe.com/…", keyboard = KeyboardType.Uri)
                Field(p.payAnnual, { p.payAnnual = it }, "Yearly link", placeholder = "https://buy.stripe.com/…", keyboard = KeyboardType.Uri)
                Hint("Without these, clients who pick those options are told you'll send an invoice.")
            }
        }
    }
}

@Composable
private fun WaysToPayCard(f: SettingsForm) {
    CollapsibleCard("Ways to pay") {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Field(f.shortMonths, { f.shortMonths = it }, "Short plan (months)", hint = "No setup fee · 0 = don't offer", keyboard = KeyboardType.Number, modifier = Modifier.weight(1f))
            Field(f.minMonths, { f.minMonths = it }, "Standard plan (months)", hint = "No setup fee", keyboard = KeyboardType.Number, modifier = Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Field(f.flexSetup, { f.flexSetup = it }, "Month-to-month setup (\$)", hint = "0 = don't offer", keyboard = KeyboardType.Decimal, modifier = Modifier.weight(1f))
            Field(f.annualMonthsFree, { f.annualMonthsFree = it }, "Yearly: months free", hint = "0 = don't offer", keyboard = KeyboardType.Number, modifier = Modifier.weight(1f))
        }
        Field(f.churchAnnualMonthsFree, { f.churchAnnualMonthsFree = it }, "Churches & nonprofits: yearly months free", hint = "4 = 12 months for the price of 8", keyboard = KeyboardType.Number)
        CheckRow(f.invoiceForAll, { f.invoiceForAll = it }, "Offer “Pay by check or bank transfer (we'll send an invoice)” to every client, not only churches")
    }
}

@Composable
private fun FeesCard(f: SettingsForm) {
    CollapsibleCard("Fees, goals & commission") {
        Field(f.lateFee, { f.lateFee = it }, "Late fee (\$)", hint = "Added once per missed payment, 10 days after it fails · 0 = none", keyboard = KeyboardType.Decimal)
        Field(f.payoffDiscount, { f.payoffDiscount = it }, "Early payoff discount (%)", hint = "Off the remaining months when they pay the early cancellation fee up front · 0 = none", keyboard = KeyboardType.Number)
        Field(f.interestRate, { f.interestRate = it }, "Interest on overdue balances (% a year)", hint = "After 30 days overdue · Alabama allows up to 8 in a written contract · 0 = none", keyboard = KeyboardType.Decimal)
        Field(f.reinstatementFee, { f.reinstatementFee = it }, "Reinstatement fee (\$)", hint = "To put a site back online after non-payment · 0 = none", keyboard = KeyboardType.Decimal)
        Field(f.returnedPaymentFee, { f.returnedPaymentFee = it }, "Returned payment / dispute fee (\$)", hint = "A bank debit that bounces or a charge they dispute · 0 = none", keyboard = KeyboardType.Decimal)
        SubHead("Team goals & commission")
        Field(f.dailyCalls, { f.dailyCalls = it }, "Daily call goal per person", hint = "Shows as a progress bar on the Today card. 0 = off", keyboard = KeyboardType.Number)
        Field(f.commission, { f.commission = it }, "Commission per sale (\$)", keyboard = KeyboardType.Decimal)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun PreviewCard(m: SettingsMeta, plan: String, onPlan: (String) -> Unit, billing: String, onBilling: (String) -> Unit, nav: NavHostController) {
    val s = m.settings
    val plans = s.optJSONArray("plans").objects().filter { it.optDouble("monthly", 0.0) > 0 }
    val billingOptions = listOf("standard", "short", "flex", "annual", "invoice").filter { id ->
        (id != "short" || truthy(s, "shortMonths")) && (id != "flex" || truthy(s, "flexSetup")) && (id != "annual" || truthy(s, "annualMonthsFree"))
    }
    val billingPicked = if (billing in billingOptions) billing else billingOptions.first()
    fun label(id: String) = when (id) {
        "standard" -> "${numText(s, "minMonths", "12")}${BILLING_LABELS[id]}"
        "short" -> "${numText(s, "shortMonths", "6")}${BILLING_LABELS[id]}"
        else -> BILLING_LABELS[id] ?: id
    }
    val qs = "plan=${URLEncoder.encode(plan, "UTF-8")}&billing=${URLEncoder.encode(billingPicked, "UTF-8")}"
    CollapsibleCard("📄 Preview the agreement") {
        Hint("See the exact agreement a client would sign with the numbers above. Uses what's saved, so tap Save first after changing anything.")
        if (plans.isEmpty()) Hint("Save a plan with a monthly price first.", Modifier.padding(top = 6.dp))
        else {
            Text("Plan", style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(top = 8.dp))
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                plans.forEach { p -> val id = p.optString("id"); FilterChip(selected = plan == id, onClick = { onPlan(id) }, label = { Text(p.optString("name", id)) }) }
            }
            Text("Way to pay", style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(top = 6.dp))
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                billingOptions.forEach { id -> FilterChip(selected = billingPicked == id, onClick = { onBilling(id) }, label = { Text(label(id)) }) }
            }
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 8.dp)) {
                Button(onClick = { nav.navigate(pdfNav("/api/contract.pdf?$qs", "Agreement")) }) { Text("Show the example agreement (PDF)") }
            }
        }
        TextButton(onClick = { nav.navigate(pdfNav("/api/ach.pdf", "Payment authorization form")) }, contentPadding = PaddingValues(0.dp), modifier = Modifier.padding(top = 4.dp)) { Text("⬇ Blank payment authorization form (ACH debit or card, PDF)") }
        Hint("For clients who pay by invoice or want a paper authorization on file. Bank and card numbers go on the paper and into Stripe, never into this app.")
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ExtrasCard(f: SettingsForm) {
    CollapsibleCard("Extras") {
        Hint("Shown on the sign-up page and in call guides. Leave a name blank to remove it.")
        f.addons.forEachIndexed { i, a ->
            if (i > 0) HorizontalDivider(Modifier.padding(vertical = 8.dp))
            Field(a.name, { a.name = it }, "Extra ${i + 1}", placeholder = "New extra", caps = KeyboardCapitalization.Sentences)
            Field(a.price, { a.price = it }, "Price (\$)", keyboard = KeyboardType.Decimal)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 2.dp)) {
                UNIT_OPTIONS.forEach { (id, label) -> FilterChip(selected = a.unit == id, onClick = { a.unit = id }, label = { Text(label) }) }
            }
            Field(a.about, { a.about = it }, "What they get", placeholder = "One sentence on what they get", caps = KeyboardCapitalization.Sentences)
            Row(verticalAlignment = Alignment.CenterVertically) {
                TextButton(onClick = { a.showTerms = !a.showTerms }, contentPadding = PaddingValues(0.dp)) { Text(if (a.showTerms) "▾ Contract terms for this extra" else "▸ Contract terms for this extra") }
                Spacer(Modifier.weight(1f))
                TextButton(onClick = { f.addons.remove(a) }) { Text("Remove", color = Warn) }
            }
            if (a.showTerms) {
                Field(a.terms, { a.terms = it.take(1500) }, "Contract terms", singleLine = false, minLines = 4, caps = KeyboardCapitalization.Sentences)
                Hint("Shown in the agreement customers sign when they pick this extra.")
            }
        }
        OutlinedButton(onClick = { f.addons.add(AddonForm("", "", "one-time", "", "")) }, modifier = Modifier.padding(top = 10.dp)) { Text("➕ Add an extra") }
    }
}

@Composable
private fun AgreementCard(f: SettingsForm, onReset: () -> Unit) {
    CollapsibleCard("Client agreement") {
        Hint("Plain-language starting point, not legal advice. Have a lawyer look it over once.")
        OutlinedTextField(
            value = f.terms,
            onValueChange = { f.terms = it },
            modifier = Modifier.fillMaxWidth().padding(top = 6.dp),
            minLines = 8,
            maxLines = 24,
            keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences),
        )
        OutlinedButton(onClick = onReset, modifier = Modifier.padding(top = 6.dp)) { Text("Reset agreement to the standard text") }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun RunsCard(f: SettingsForm, m: SettingsMeta) {
    CollapsibleCard("Runs") {
        Field(f.cap, { f.cap = it.filter { ch -> ch.isDigit() }.take(3) }, "Default most sites per run", keyboard = KeyboardType.Number)
        Text("AI writer", style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(top = 8.dp))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            m.models.forEach { mo -> FilterChip(selected = f.model == mo.id, onClick = { f.model = mo.id }, label = { Text(mo.label) }) }
        }
    }
}

@Composable
private fun UsageCard(u: Usage?) {
    CollapsibleCard("Spending, last 30 days") {
        if (u == null) Hint("Couldn't load spending.", Modifier.padding(top = 4.dp))
        else {
            Text("AI writing: ${String.format(Locale.US, "\$%.2f", u.aiCost)}", modifier = Modifier.padding(top = 4.dp))
            Hint("${String.format(Locale.US, "%,d", u.aiTokensIn)} in / ${String.format(Locale.US, "%,d", u.aiTokensOut)} out tokens")
            Text("Google: about ${String.format(Locale.US, "\$%.2f", u.googleCostEstimate)}", modifier = Modifier.padding(top = 6.dp))
            Hint("${u.googleRequests} searches, ${u.googlePhotos} photos; estimate, before Google's free monthly credit")
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun TeamCard(
    callers: List<Caller>,
    meId: String,
    domain: String,
    onEmail: (Caller) -> Unit,
    onPassword: (Caller) -> Unit,
    onAdmin: (Caller) -> Unit,
    onToggle: (Caller) -> Unit,
    onRemove: (Caller) -> Unit,
    onAdd: (name: String, email: String, password: String, admin: Boolean) -> Unit,
) {
    var newName by remember { mutableStateOf("") }
    var newEmail by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }
    var newAdmin by remember { mutableStateOf(false) }
    CollapsibleCard("Team") {
        Hint("Callers can see leads, previews and call guides, text preview links, log calls and set callbacks. They can't run searches, edit or publish sites, delete leads, or see settings, spending or the inbox.\nFull access can do everything you can, under their own name.")
        if (callers.isEmpty()) Hint("No callers yet.", Modifier.padding(top = 8.dp))
        callers.forEach { c ->
            HorizontalDivider(Modifier.padding(vertical = 8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(c.name, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                Text(if (c.admin) "Full access" else "Caller", style = MaterialTheme.typography.labelMedium, color = if (c.admin) Good else MaterialTheme.colorScheme.onSurfaceVariant)
                if (c.disabled) Text("  Turned off", style = MaterialTheme.typography.labelMedium, color = Warn)
            }
            Hint(if (c.email != null) "✉️ ${c.email}${if (c.googleOnly) " · Google sign-in only" else ""}" else "No Google address yet")
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.padding(top = 4.dp)) {
                OutlinedButton(onClick = { onEmail(c) }) { Text(if (c.email != null) "Change email" else "Add Google email") }
                OutlinedButton(onClick = { onPassword(c) }) { Text("New password") }
                if (c.id != meId) OutlinedButton(onClick = { onAdmin(c) }) { Text(if (c.admin) "Make caller" else "Give full access") }
                OutlinedButton(onClick = { onToggle(c) }) { Text(if (c.disabled) "Turn on" else "Turn off") }
                OutlinedButton(onClick = { onRemove(c) }) { Text("Remove", color = Warn) }
            }
        }
        HorizontalDivider(Modifier.padding(vertical = 10.dp))
        Text("Add someone", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
        Field(newName, { newName = it.take(60) }, "Their name", placeholder = "Used in texts, call guides and notes", caps = KeyboardCapitalization.Words)
        Field(newEmail, { newEmail = it }, "Their company Google address", hint = "They sign in with Google using this address (anyone on the company domain can also just sign in and shows up here as a caller).", placeholder = "name@$domain", keyboard = KeyboardType.Email)
        Field(newPassword, { newPassword = it }, "Their password", hint = "Optional when they have a Google address. At least 8 characters, different from everyone else's.")
        CheckRow(newAdmin, { newAdmin = it }, "Full access (can do everything you can)")
        Button(
            onClick = {
                onAdd(newName.trim(), newEmail.trim(), newPassword, newAdmin)
                newName = ""; newEmail = ""; newPassword = ""; newAdmin = false
            },
            enabled = newName.isNotBlank() && (newEmail.isNotBlank() || newPassword.length >= 8),
            modifier = Modifier.padding(top = 6.dp),
        ) { Text("Add") }
    }
}

/* ---------- dialogs ---------- */

@Composable
private fun ConfirmDialog(title: String, text: String, confirm: String, onDismiss: () -> Unit, onConfirm: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = { Text(text) },
        confirmButton = { TextButton(onClick = onConfirm) { Text(confirm) } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

@Composable
private fun PromptDialog(
    title: String,
    label: String,
    initial: String,
    keyboard: KeyboardType = KeyboardType.Text,
    password: Boolean = false,
    onDismiss: () -> Unit,
    onOk: (String) -> Unit,
) {
    var value by remember(title) { mutableStateOf(initial) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            Column {
                Hint(label)
                OutlinedTextField(
                    value = value,
                    onValueChange = { value = it },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = if (password) KeyboardType.Password else keyboard),
                    visualTransformation = if (password) PasswordVisualTransformation() else VisualTransformation.None,
                    modifier = Modifier.fillMaxWidth().padding(top = 6.dp),
                )
            }
        },
        confirmButton = { TextButton(onClick = { onOk(value) }) { Text("OK") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}
