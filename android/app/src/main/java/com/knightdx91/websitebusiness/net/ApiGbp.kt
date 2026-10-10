package com.knightdx91.websitebusiness.net

import org.json.JSONObject

/** The bits of `GET /api/leads/:id` the Google profile tools need. */
data class GbpLead(
    val id: String,
    val name: String,
    val phone: String?,
    /** The site's phone in display form, e.g. "(256) 555-0123"; null until the site is built. */
    val phoneDisplay: String?,
    /** "Street, City, ST ZIP" from the record; empty until the site is built. */
    val addressLine: String,
    val city: String,
    val variantLabel: String?,
    val category: String,
    val variant: String?,
    val hasRecord: Boolean,
) {
    /** Financial advisors get no review cards or review requests (same rule as the web's `noReviews`). */
    val noReviews: Boolean get() = category == "finance" && variant == "financial_advisor"

    companion object {
        fun from(j: JSONObject): GbpLead {
            val r = j.optJSONObject("record")
            val a = r?.optJSONObject("address")
            val cityLine = if (a != null) "${a.optString("city")}, ${a.optString("state")} ${a.optString("zip", "")}".trim() else ""
            return GbpLead(
                id = j.optString("id"),
                name = r?.str("name") ?: j.optString("name", ""),
                phone = j.str("phone"),
                phoneDisplay = r?.optJSONObject("phone")?.str("display"),
                addressLine = listOfNotNull(a?.str("street"), cityLine.ifBlank { null }).joinToString(", "),
                city = a?.optString("city", "") ?: "",
                variantLabel = j.str("variantLabel"),
                category = j.optString("category"),
                variant = r?.str("variant"),
                hasRecord = r != null,
            )
        }
    }
}

data class GbpService(val name: String, val description: String)

data class GbpKit(val description: String, val services: List<GbpService>, val problems: List<String>)

/** A Google post draft (`button` set) or a Facebook/Instagram draft (`photo` set). Ids are unique across both lists. */
data class GbpPostItem(
    val id: String,
    val topic: String,
    val text: String,
    val button: String?,
    val photo: String?,
    val month: String,
    val status: String,
    val problems: List<String>,
) {
    val isDraft get() = status == "draft"
    val isPosted get() = status == "posted"

    companion object {
        fun from(j: JSONObject) = GbpPostItem(
            id = j.optString("id"),
            topic = j.optString("topic"),
            text = j.optString("text"),
            button = j.str("button"),
            photo = j.str("photo"),
            month = j.optString("month"),
            status = j.optString("status", "draft"),
            problems = j.optJSONArray("problems").strings(),
        )
    }
}

/**
 * `leads.gbp_json` plus what only the GET adds (`website`, `mapsUrl`, `gbpEmail`). PUT/POST answers carry the state alone,
 * so `merged()` keeps those three, the way the web app's `Object.assign(g, result)` does.
 */
data class GbpState(
    val checks: Map<String, Boolean>,
    val kit: GbpKit?,
    val posts: List<GbpPostItem>,
    val notes: String,
    val social: List<GbpPostItem>,
    val website: String?,
    val mapsUrl: String?,
    val gbpEmail: String?,
) {
    fun checked(key: String) = checks[key] == true

    fun merged(j: JSONObject): GbpState {
        val next = from(j)
        return next.copy(
            website = if (j.has("website")) next.website else website,
            mapsUrl = if (j.has("mapsUrl")) next.mapsUrl else mapsUrl,
            gbpEmail = if (j.has("gbpEmail")) next.gbpEmail else gbpEmail,
        )
    }

    companion object {
        fun from(j: JSONObject): GbpState {
            val checks = LinkedHashMap<String, Boolean>()
            j.optJSONObject("checks")?.let { c -> c.keys().forEach { k -> checks[k] = c.optBoolean(k) } }
            val kit = j.optJSONObject("kit")?.let { k ->
                GbpKit(
                    description = k.optString("description", ""),
                    services = k.optJSONArray("services").objects().map { GbpService(it.optString("name"), it.optString("description")) },
                    problems = k.optJSONArray("problems").strings(),
                )
            }
            return GbpState(
                checks = checks,
                kit = kit,
                posts = j.optJSONArray("posts").objects().map { GbpPostItem.from(it) },
                notes = j.optString("notes", ""),
                social = j.optJSONArray("social").objects().map { GbpPostItem.from(it) },
                website = j.str("website"),
                mapsUrl = j.str("mapsUrl"),
                gbpEmail = j.str("gbpEmail"),
            )
        }
    }
}

data class GbpReply(val reply: String, val problems: List<String>)

suspend fun Api.gbpLead(id: String): GbpLead = GbpLead.from(getJson("/leads/$id"))

/** `GET /api/leads/:id/gbp` (owner only; 409 until the site is built). */
suspend fun Api.gbp(id: String): GbpState = GbpState.from(getJson("/leads/$id/gbp"))

/** `PUT /api/leads/:id/gbp {check, done}`: a tune-up or listings checkbox. */
suspend fun Api.gbpCheck(id: String, key: String, done: Boolean): JSONObject = putJson("/leads/$id/gbp", JSONObject().put("check", key).put("done", done))

/** `PUT /api/leads/:id/gbp {postId, posted}`: mark a Google or social draft posted (or back to draft). */
suspend fun Api.gbpSetPosted(id: String, postId: String, posted: Boolean): JSONObject = putJson("/leads/$id/gbp", JSONObject().put("postId", postId).put("posted", posted))

/** `PUT /api/leads/:id/gbp {postId, removePost}`: delete a draft. */
suspend fun Api.gbpRemovePost(id: String, postId: String): JSONObject = putJson("/leads/$id/gbp", JSONObject().put("postId", postId).put("removePost", true))

/** `POST /api/leads/:id/gbp/kit`: Claude writes the profile description + service blurbs (about 15 seconds). */
suspend fun Api.gbpWriteKit(id: String): JSONObject = postJson("/leads/$id/gbp/kit")

/** `POST /api/leads/:id/gbp/posts {count, notes}`: monthly Google posts. */
suspend fun Api.gbpWritePosts(id: String, count: Int, notes: String): JSONObject = postJson("/leads/$id/gbp/posts", JSONObject().put("count", count).put("notes", notes))

/** `POST /api/leads/:id/gbp/social {count, notes}`: Facebook/Instagram drafts (about 30 seconds). */
suspend fun Api.gbpWriteSocial(id: String, count: Int, notes: String): JSONObject = postJson("/leads/$id/gbp/social", JSONObject().put("count", count).put("notes", notes))

/** `POST /api/leads/:id/gbp/reply {review, stars, reviewer?}`: a reply draft; nothing is stored. */
suspend fun Api.gbpWriteReply(id: String, review: String, stars: Int, reviewer: String?): GbpReply {
    val b = JSONObject().put("review", review).put("stars", stars)
    if (!reviewer.isNullOrBlank()) b.put("reviewer", reviewer.trim())
    val r = postJson("/leads/$id/gbp/reply", b)
    return GbpReply(r.optString("reply"), r.optJSONArray("problems").strings())
}
