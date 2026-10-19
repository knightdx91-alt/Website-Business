package com.knightdx91.websitebusiness.net

import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar
import java.util.TimeZone

/*
 * The sales copy and the plan pricing behind Plans & answers, Show plans and the In-person guide.
 * `GET /api/content` is the copy (owner and callers), fetched once per app run and cached in [AppContent];
 * `GET /api/plans/options?lead=<id>` is every plan's ways to pay with what is due today, computed on the server.
 */

data class Objection(val question: String, val answer: String)
data class PlanPitch(val fit: String, val points: List<String>, val line: String)
data class FollowUp(val label: String, val text: String)
data class OfferHint(val match: Regex, val text: String)
data class WalkinQuestions(val before: List<String>, val restaurant: String, val services: String, val after: List<String>)
data class WalkinShow(val name: String, val hours: String, val directions: String, val menu: String, val services: String, val servicesGeneric: String, val reviews: String)
data class ChurchYearly(val free: Int, val payFor: Int, val plans: List<Pair<String, String>>)

data class Content(
    val planTagline: Map<String, String>,
    val everyPlan: List<String>,
    val planPitch: Map<String, PlanPitch>,
    val planQuestions: List<Pair<String, String>>,
    /** Already filled with the prices and terms from Settings. */
    val playbookObjections: List<Objection>,
    val playbookAlways: List<String>,
    val offerHints: List<OfferHint>,
    /** Templates with `{greeting}`, `{name}`, `{url}` (and `{plan}` for the sign-up text). */
    val followUps: List<FollowUp>,
    val shareText: String,
    val signupText: String,
    val walkinTiming: Map<String, String>,
    val walkinTimingUnknown: String,
    val walkinTimingGeneral: String,
    /** Templates with `{price}` = PlanOptions.priceShort. */
    val walkinObjections: List<Objection>,
    val walkinObjectionsChurch: List<Objection>,
    val walkinQuestions: WalkinQuestions,
    val walkinShow: WalkinShow,
    val walkinAlways: List<String>,
    val churchYearly: ChurchYearly?,
) {
    /** "Offer to: …" for an extra, matched on its name like the web's OFFER_HINT. */
    fun offerHint(name: String): String = offerHints.firstOrNull { it.match.containsMatchIn(name) }?.text ?: ""

    companion object {
        private fun pairs(a: JSONArray?): List<Pair<String, String>> {
            if (a == null) return emptyList()
            val out = ArrayList<Pair<String, String>>(a.length())
            for (i in 0 until a.length()) a.optJSONArray(i)?.let { out.add(it.optString(0) to it.optString(1)) }
            return out
        }

        private fun objections(a: JSONArray?) = pairs(a).map { Objection(it.first, it.second) }

        private fun stringMap(j: JSONObject?): Map<String, String> {
            if (j == null) return emptyMap()
            val out = LinkedHashMap<String, String>()
            j.keys().forEach { k -> out[k] = j.optString(k) }
            return out
        }

        fun from(j: JSONObject): Content {
            val pitch = LinkedHashMap<String, PlanPitch>()
            j.optJSONObject("planPitch")?.let { p -> p.keys().forEach { k -> val x = p.getJSONObject(k); pitch[k] = PlanPitch(x.optString("fit"), x.optJSONArray("points").strings(), x.optString("line")) } }
            val q = j.optJSONObject("walkinQuestions") ?: JSONObject()
            val s = j.optJSONObject("walkinShow") ?: JSONObject()
            val cy = j.optJSONObject("churchYearly")
            return Content(
                planTagline = stringMap(j.optJSONObject("planTagline")),
                everyPlan = j.optJSONArray("everyPlan").strings(),
                planPitch = pitch,
                planQuestions = pairs(j.optJSONArray("planQuestions")),
                playbookObjections = objections(j.optJSONArray("playbookObjections")),
                playbookAlways = j.optJSONArray("playbookAlways").strings(),
                offerHints = j.optJSONArray("offerHints").objects().map { OfferHint(Regex(it.optString("match"), RegexOption.IGNORE_CASE), it.optString("text")) },
                followUps = j.optJSONArray("followUps").objects().map { FollowUp(it.optString("label"), it.optString("text")) },
                shareText = j.optString("shareText", "{greeting} Here's the free website preview I made for {name}: {url}"),
                signupText = j.optString("signupText", "{greeting} Here's the sign-up page for your new website ({plan} plan) for {name}: {url}"),
                walkinTiming = stringMap(j.optJSONObject("walkinTiming")),
                walkinTimingUnknown = j.optString("walkinTimingUnknown", "A slow part of their day, never during a rush."),
                walkinTimingGeneral = j.optString("walkinTimingGeneral", "A slow part of their day, never during a rush."),
                walkinObjections = objections(j.optJSONArray("walkinObjections")),
                walkinObjectionsChurch = objections(j.optJSONArray("walkinObjectionsChurch")),
                walkinQuestions = WalkinQuestions(q.optJSONArray("before").strings(), q.optString("restaurant"), q.optString("services"), q.optJSONArray("after").strings()),
                walkinShow = WalkinShow(s.optString("name"), s.optString("hours"), s.optString("directions"), s.optString("menu"), s.optString("services"), s.optString("servicesGeneric"), s.optString("reviews")),
                walkinAlways = j.optJSONArray("walkinAlways").strings(),
                churchYearly = cy?.let { ChurchYearly(it.optInt("free"), it.optInt("payFor"), it.optJSONArray("plans").objects().map { p -> p.optString("name") to p.optString("year") }) },
            )
        }
    }
}

/** Fills `{greeting}`, `{name}`, `{url}`, `{price}`… in a template from the server. */
fun String.fill(vararg values: Pair<String, String>): String {
    var out = this
    for ((k, v) in values) out = out.replace("{$k}", v)
    return out
}

/** The copy, fetched once per app run. A failed load is not cached, so the next screen tries again. */
object AppContent {
    @Volatile private var cached: Content? = null

    suspend fun load(api: Api): Content = cached ?: api.content().also { cached = it }
}

suspend fun Api.content(): Content = Content.from(getJson("/content"))

data class BillingChoice(
    val id: String, val label: String, val detail: String, val monthlyEquivalent: Double, val dueTodayCents: Long,
    /** What the plan alone renews at (cents) and how often ("month" / "year"); null when nothing renews. */
    val renewsCents: Long? = null, val renewsInterval: String? = null,
)

data class PlanOffer(val id: String, val name: String, val monthly: Double, val setup: Double, val perDay: Double, val includes: List<String>, val options: List<BillingChoice>)

data class PayWay(val title: String, val detail: String)

data class FounderChoice(val index: Int, val name: String, val price: String, val about: String)
data class FounderOffer(val slotsLeft: Int, val total: Int, val choices: List<FounderChoice>)
data class ReferredBy(val id: String, val name: String, val months: Int)

data class PlanTerms(val min: Int, val short: Int, val commits: List<Int>, val commitWords: String, val flex: Double, val free: Int)

data class AddonInfo(val name: String, val about: String, val price: String, val unit: String, /** The raw price in dollars (0 for "priced per job"). */ val amount: Double = 0.0, /** "inventory" = a piece of the live price list, listed under its own heading. */ val group: String = "general", /** Monthly extras: charged once with the first payment (the domain's registration). */ val setup: Double = 0.0)

data class PlanOptions(
    val church: Boolean,
    val plans: List<PlanOffer>,
    val terms: PlanTerms,
    val payWays: List<PayWay>,
    /** "plans start at $49 a month with no setup fee on the 6- or 12-month plan" */
    val priceShort: String,
    val invoice: Boolean,
    val addons: List<AddonInfo>,
    /** Founding-customer bonus while spots are open: the free extras to pick from. */
    val founder: FounderOffer? = null,
    /** Signer name / email to start the form with (the lead's contact and known business email). */
    val prefillName: String = "",
    val prefillEmail: String = "",
    /** The client who referred this lead (the sign-up shows them what the referrer earns). */
    val referredBy: ReferredBy? = null,
) {
    /** The middle plan to lead with: Plus, else the one in the middle. */
    val middle: PlanOffer? get() = plans.firstOrNull { it.id == "plus" } ?: plans.getOrNull(plans.size / 2) ?: plans.firstOrNull()

    /** " with no setup fee on the 6- or 12-month plan", or nothing when there is no commitment plan. */
    val noSetupClause: String get() = if (terms.commits.isNotEmpty()) " with no setup fee on the ${terms.commitWords} plan" else ""

    companion object {
        fun from(j: JSONObject): PlanOptions {
            val t = j.optJSONObject("terms") ?: JSONObject()
            val commits = ArrayList<Int>()
            t.optJSONArray("commits")?.let { a -> for (i in 0 until a.length()) commits.add(a.optInt(i)) }
            return PlanOptions(
                church = j.optBoolean("church"),
                plans = j.optJSONArray("plans").objects().map { p ->
                    PlanOffer(
                        id = p.optString("id"), name = p.optString("name"), monthly = p.optDouble("monthly", 0.0), setup = p.optDouble("setup", 0.0), perDay = p.optDouble("perDay", 0.0),
                        includes = p.optJSONArray("includes").strings(),
                        options = p.optJSONArray("options").objects().map { o ->
                            val renews = o.optJSONObject("renews")
                            BillingChoice(o.optString("id"), o.optString("label"), o.optString("detail"), o.optDouble("monthlyEquivalent", 0.0), o.optLong("dueTodayCents", 0L), renews?.optLong("amount"), renews?.str("interval"))
                        },
                    )
                },
                terms = PlanTerms(t.optInt("min"), t.optInt("short"), commits, t.optString("commitWords"), t.optDouble("flex", 0.0), t.optInt("free")),
                payWays = j.optJSONArray("payWays").objects().map { PayWay(it.optString("title"), it.optString("detail")) },
                priceShort = j.optString("priceShort", "it's a low monthly price"),
                invoice = j.optBoolean("invoice"),
                prefillName = j.optJSONObject("prefill")?.optString("name") ?: "",
                prefillEmail = j.optJSONObject("prefill")?.optString("email") ?: "",
                founder = j.optJSONObject("founder")?.let { f -> FounderOffer(f.optInt("slotsLeft"), f.optInt("total"), f.optJSONArray("choices").objects().map { c -> FounderChoice(c.optInt("index"), c.optString("name"), c.optString("price"), c.optString("about")) }) },
                referredBy = j.optJSONObject("referredBy")?.let { r -> ReferredBy(r.optString("id"), r.optString("name"), r.optInt("months")) },
                addons = j.optJSONArray("addons").objects().map { AddonInfo(it.optString("name"), it.optString("about"), it.optString("price"), it.optString("unit"), it.optDouble("amount", priceInText(it.optString("price"))), it.optString("group", "general"), it.optDouble("setup", 0.0)) },
            )
        }
    }
}

/** "$35 each" → 35.0: the price out of its text, for servers that don't send `amount` yet. */
private fun priceInText(text: String): Double = Regex("""\d+(?:\.\d+)?""").find(text)?.value?.toDoubleOrNull() ?: 0.0

/** Every plan's ways to pay, priced on the server; `leadId` makes churches get the ministry rate. */
suspend fun Api.planOptions(leadId: String?): PlanOptions =
    PlanOptions.from(getJson("/plans/options" + (if (leadId != null) "?lead=$leadId" else "")))

/** Leaving a flyer marks a New lead Shown (the web app POSTs this before opening the printable). */
suspend fun Api.flyerLeft(leadId: String): JSONObject = postJson("/leads/$leadId/flyer")

/** The bits of a lead and its site record the In-person guide talks about. */
data class WalkinLead(
    val lead: Lead,
    val variantLabel: String?,
    /** The record's variant (e.g. financial_advisor, tax_prep). */
    val variant: String?,
    val mapsUrl: String?,
    /** The first three service names on the site. */
    val services: List<String>,
    val hasHours: Boolean,
    /** "Open today 11 AM–8 PM" / "Closed today", or empty without hours. */
    val today: String,
) {
    val name get() = lead.name

    companion object {
        private fun hm(x: String): String {
            val parts = x.split(":")
            val h = parts.getOrNull(0)?.toIntOrNull() ?: return x
            val m = parts.getOrNull(1)?.toIntOrNull() ?: 0
            val hh = if (h % 12 == 0) 12 else h % 12
            return "$hh${if (m != 0) ":" + m.toString().padStart(2, '0') else ""} ${if (h in 12..23) "PM" else "AM"}"
        }

        fun from(j: JSONObject): WalkinLead {
            val lead = Lead.from(j)
            val r = j.optJSONObject("record")
            val weekly = r?.optJSONObject("hours")?.optJSONArray("weekly")
            var hasHours = false
            if (weekly != null) for (i in 0 until weekly.length()) if ((weekly.optJSONArray(i)?.length() ?: 0) > 0) hasHours = true
            val today = if (!hasHours || weekly == null) "" else {
                val day = Calendar.getInstance(TimeZone.getTimeZone("America/Chicago")).get(Calendar.DAY_OF_WEEK) - 1 // 0 = Sunday, like the record
                val iv = weekly.optJSONArray(day).objects()
                if (iv.isEmpty()) "Closed today" else "Open today " + iv.joinToString(", ") { "${hm(it.optString("open"))}–${hm(it.optString("close"))}" }
            }
            val recordName = r?.str("name")
            return WalkinLead(
                lead = if (recordName != null) lead.copy(name = recordName) else lead,
                variantLabel = j.str("variantLabel"),
                variant = r?.str("variant"),
                mapsUrl = r?.str("mapsUrl"),
                services = r?.optJSONArray("services").objects().take(3).map { it.optString("name") }.filter { it.isNotBlank() },
                hasHours = hasHours,
                today = today,
            )
        }
    }
}

suspend fun Api.walkinLead(id: String): WalkinLead = WalkinLead.from(getJson("/leads/$id"))
