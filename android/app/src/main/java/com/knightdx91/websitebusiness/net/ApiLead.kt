package com.knightdx91.websitebusiness.net

import org.json.JSONObject

/*
 * The rest of `GET /api/leads/:id` the lead screen uses beyond [LeadDetail] (design pickers, lint, cadence, the site record's
 * name and Google link, extras bought later), plus the owner actions behind the Website / Design / Client site / Publish cards.
 */

/** One value of a design knob (opening, top bar, buttons…). */
data class DnaValue(val id: String, val name: String)

/** A design knob from `dnaOrder`: its id, the letter used in the design id, and the values in order. */
data class DnaKnob(val id: String, val letter: String, val label: String, val values: List<DnaValue>)

/** A named page structure ("Photo first", "Menu board"…) that `POST /restyle {recipe}` keeps the colors for. */
data class DnaRecipe(val id: String, val name: String, val about: String)

data class NamedOption(val id: String, val name: String)

/** Extras a client bought later through a Buy extras link. */
data class Purchase(val id: String, val items: List<String>, val dueCents: Long, val paid: Boolean, val createdAt: Long)

data class Cadence(val day: Int, val next: String)

data class LeadFull(
    val detail: LeadDetail,
    /** The site record's name (the business as the site shows it), else the lead's. */
    val name: String,
    /** The phone in display form from the site record, e.g. "(256) 555-0123". */
    val phoneDisplay: String?,
    val mapsUrl: String?,
    val variant: String?,
    val error: String?,
    val customDomain: String?,
    /** lint.errors + lint.publishBlockers: what must be fixed before publishing. */
    val blockers: List<String>,
    val suggestions: List<String>,
    val looks: List<NamedOption>,
    val layouts: List<NamedOption>,
    val dnaOrder: List<DnaKnob>,
    val dnaRecipes: List<DnaRecipe>,
    /** knob id → value id for the current design (empty before the site is built). */
    val dna: Map<String, String>,
    val layout: String?,
    val lookBase: String?,
    val cadence: Cadence?,
    val purchases: List<Purchase>,
) {
    val lead get() = detail.lead

    /** Financial advisors get no review cards or review requests (same rule as the web's `noReviews`). */
    val noReviews: Boolean get() = lead.category == "finance" && variant == "financial_advisor"

    /** "Warm Diner · Classic · Full-screen photo": look, layout and opening, like the web's lookName. */
    val designName: String get() {
        val hero = dnaOrder.firstOrNull { it.id == "hero" }?.let { k -> k.values.firstOrNull { it.id == dna["hero"] }?.name }
        return listOfNotNull(looks.firstOrNull { it.id == lookBase }?.name, layouts.firstOrNull { it.id == layout }?.name, hero).joinToString(" · ")
    }

    /** The structure part of the design id, exactly as the web computes it from `dnaOrder` and `dna`. */
    fun dnaCode(): String = dnaOrder.joinToString("") { k ->
        val want = dna[k.id] ?: k.values.firstOrNull()?.id
        k.letter + maxOf(0, k.values.indexOfFirst { it.id == want })
    }

    /** The full design id for a different look, keeping the layout and structure. */
    fun lookId(look: String): String = "$look~${layout ?: "classic"}~${dnaCode()}"

    companion object {
        fun from(j: JSONObject): LeadFull {
            val r = j.optJSONObject("record")
            val lint = j.optJSONObject("lint")
            val dna = LinkedHashMap<String, String>()
            j.optJSONObject("dna")?.let { d -> d.keys().forEach { k -> dna[k] = d.optString(k) } }
            val cadence = j.optJSONObject("cadence")
            return LeadFull(
                detail = LeadDetail.from(j),
                name = r?.str("name") ?: j.optString("name", ""),
                phoneDisplay = r?.optJSONObject("phone")?.str("display"),
                mapsUrl = r?.str("mapsUrl"),
                variant = r?.str("variant"),
                error = j.str("error"),
                customDomain = j.str("customDomain"),
                blockers = lint?.optJSONArray("errors").strings() + lint?.optJSONArray("publishBlockers").strings(),
                suggestions = lint?.optJSONArray("suggestions").strings(),
                looks = j.optJSONArray("looks").objects().map { NamedOption(it.optString("id"), it.optString("name")) },
                layouts = j.optJSONArray("layouts").objects().map { NamedOption(it.optString("id"), it.optString("name")) },
                dnaOrder = j.optJSONArray("dnaOrder").objects().map { k ->
                    DnaKnob(k.optString("id"), k.optString("letter"), k.optString("label"), k.optJSONArray("values").objects().map { DnaValue(it.optString("id"), it.optString("name")) })
                },
                dnaRecipes = j.optJSONArray("dnaRecipes").objects().map { DnaRecipe(it.optString("id"), it.optString("name"), it.optString("about")) },
                dna = dna,
                layout = j.str("layout"),
                lookBase = j.str("lookBase"),
                cadence = if (cadence != null && cadence.has("day")) Cadence(cadence.optInt("day"), cadence.optString("next")) else null,
                purchases = j.optJSONArray("purchases").objects().map { p ->
                    val items = ArrayList<String>()
                    p.optJSONArray("extras").objects().forEach { e -> items.add(if (e.optInt("qty", 1) > 1) "${e.optString("name")} ×${e.optInt("qty")}" else e.optString("name")) }
                    p.optJSONArray("quotes").strings().forEach { items.add("$it (quote)") }
                    Purchase(p.optString("id"), items, p.optLong("dueCents", 0L), p.optBoolean("paid"), p.optLong("createdAt"))
                },
            )
        }
    }
}

suspend fun Api.leadFull(id: String): LeadFull = LeadFull.from(getJson("/leads/$id"))

/** Monthly visit counts from the live site's beacons. */
data class MonthStats(val label: String, val views: Int, val calls: Int, val directions: Int, val requests: Int) {
    companion object {
        fun from(j: JSONObject?) = MonthStats(j?.optString("label") ?: "", j?.optInt("views") ?: 0, j?.optInt("calls") ?: 0, j?.optInt("directions") ?: 0, j?.optInt("requests") ?: 0)
    }
}

data class SiteStats(val thisMonth: MonthStats, val lastMonth: MonthStats)

suspend fun Api.siteStats(id: String): SiteStats {
    val j = getJson("/leads/$id/stats")
    return SiteStats(MonthStats.from(j.optJSONObject("thisMonth")), MonthStats.from(j.optJSONObject("lastMonth")))
}

/** The client's own domain on the Pages project: null `domain` means none is attached yet. */
data class DomainInfo(val domain: String?, val status: String?, val error: String?, val target: String?) {
    val active get() = status == "active"

    /** The DNS record name to add: the subdomain ("www"), or "@" for a bare domain. */
    val recordName: String get() { val d = domain ?: return "@"; return if (d.split(".").size > 2) d.substringBefore(".") else "@" }
    val bare get() = (domain ?: "").split(".").size <= 2

    companion object {
        fun from(j: JSONObject) = DomainInfo(j.str("domain"), j.str("status"), j.str("error"), j.str("target"))
    }
}

suspend fun Api.domain(id: String): DomainInfo = DomainInfo.from(getJson("/leads/$id/domain"))
suspend fun Api.addDomain(id: String, domain: String): DomainInfo = DomainInfo.from(putJson("/leads/$id/domain", JSONObject().put("domain", domain)))
suspend fun Api.removeDomain(id: String) { deleteJson("/leads/$id/domain") }

/** A new look + layout + structure (nothing given), the same colors with a new structure, or a named structure (recipe). */
suspend fun Api.restyle(id: String, recipe: String? = null, structureOnly: Boolean = false): JSONObject {
    val b = JSONObject()
    if (recipe != null) b.put("recipe", recipe)
    if (structureOnly) b.put("structureOnly", true)
    return postJson("/leads/$id/restyle", if (b.length() == 0) null else b)
}

/** Only the colors and fonts change: `look` is the full design id from [LeadFull.lookId]. */
suspend fun Api.setLook(id: String, look: String): JSONObject = putJson("/leads/$id/edits", JSONObject().put("look", look))

suspend fun Api.retryBuild(id: String): JSONObject = postJson("/leads/$id/retry")
suspend fun Api.rewrite(id: String): JSONObject = postJson("/leads/$id/rewrite")
suspend fun Api.deleteLead(id: String) { deleteJson("/leads/$id") }

/** Publishes (or republishes) the site; answers with the live `url`. */
suspend fun Api.publish(id: String): String = postJson("/leads/$id/publish").optString("url")

suspend fun Api.setPaid(id: String, signupId: String, paid: Boolean): JSONObject = postJson("/leads/$id/paid", JSONObject().put("signupId", signupId).put("paid", paid))

/** A 30-day "Buy extras" link for a sold/live client. */
suspend fun Api.extrasLink(id: String): String = postJson("/leads/$id/extraslink").optString("url")

suspend fun Api.clearFollowUp(id: String): JSONObject = putJson("/leads/$id/followup", JSONObject().put("date", JSONObject.NULL))
suspend fun Api.deleteNote(id: String, noteId: String) { deleteJson("/leads/$id/notes/$noteId") }

/** Settings → "Our Google review link", read from `/meta` (the [Meta] model doesn't carry it). */
suspend fun Api.companyReviewUrl(): String? = getJson("/meta").optJSONObject("settings")?.str("companyReviewUrl")
