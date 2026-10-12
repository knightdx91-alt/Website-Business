package com.knightdx91.websitebusiness.net

import org.json.JSONObject
import java.net.URLEncoder

/** A lead that already exists for a place found by hand. */
data class ExistingLead(val id: String, val status: String, val salesStatus: String)

/** One Google result from `GET /api/places/search?q=` with the same flags the web app shows. */
data class PlaceResult(
    val placeId: String,
    val name: String,
    val type: String?,
    val address: String,
    val phone: String?,
    val rating: Double?,
    val reviews: Int,
    val website: String?,
    val presence: String,
    val open: Boolean,
    val chain: Boolean,
    /** The template the server guessed from the Google type, or null when it couldn't tell. */
    val category: String?,
    val existing: ExistingLead?,
) {
    companion object {
        fun from(j: JSONObject) = PlaceResult(
            placeId = j.optString("placeId"),
            name = j.optString("name", ""),
            type = j.str("type"),
            address = j.optString("address", ""),
            phone = j.str("phone"),
            rating = if (j.isNull("rating")) null else j.optDouble("rating"),
            reviews = j.optInt("reviews", 0),
            website = j.str("website"),
            presence = j.optString("presence", "none"),
            open = j.optBoolean("open", true),
            chain = j.optBoolean("chain"),
            category = j.str("category"),
            existing = j.optJSONObject("existing")?.let { ExistingLead(it.optString("id"), it.optString("status"), it.optString("salesStatus")) },
        )
    }
}

data class AddLeadResult(val id: String, val existed: Boolean)

/** One Places text search near Cullman (one Google request per call; owner and callers). */
suspend fun Api.searchPlaces(q: String): List<PlaceResult> =
    getJson("/places/search?q=" + URLEncoder.encode(q.trim(), "UTF-8")).optJSONArray("results").objects().map { PlaceResult.from(it) }

/** `POST /api/leads/add {placeId, category, phone?}`: inserts (or revives) the lead and queues the build. */
suspend fun Api.addLead(placeId: String, category: String, phone: String?): AddLeadResult {
    val b = JSONObject().put("placeId", placeId).put("category", category)
    if (!phone.isNullOrBlank()) b.put("phone", phone.trim())
    val r = postJson("/leads/add", b)
    return AddLeadResult(r.optString("id"), r.optBoolean("existed"))
}

/** `POST /api/leads/manual`: a business that isn't on Google Maps, built from what was typed in. */
suspend fun Api.addManualLead(
    name: String, phone: String, town: String, street: String, zip: String,
    kind: String, category: String, web: String, comesToCustomers: Boolean,
): AddLeadResult {
    val b = JSONObject().put("name", name.trim()).put("phone", phone.trim()).put("town", town.trim())
        .put("category", category).put("comesToCustomers", comesToCustomers)
    if (street.isNotBlank()) b.put("street", street.trim())
    if (zip.isNotBlank()) b.put("zip", zip.trim())
    if (kind.isNotBlank()) b.put("kind", kind.trim())
    if (web.isNotBlank()) b.put("web", web.trim())
    val r = postJson("/leads/manual", b)
    return AddLeadResult(r.optString("id"), r.optBoolean("existed"))
}

/** Open leads with their Google Place IDs (the walk-in route's directions link carries them). */
data class RouteLead(val lead: Lead, val placeId: String?)

suspend fun Api.routeLeads(): List<RouteLead> =
    getJson("/leads").optJSONArray("leads").objects().map { RouteLead(Lead.from(it), it.str("placeId")) }

/** Leaving a flyer counts as showing them: POST first (marks a New lead Shown), then open the printable GET. */
suspend fun Api.flyerShown(leadId: String) {
    postJson("/leads/$leadId/flyer")
}
