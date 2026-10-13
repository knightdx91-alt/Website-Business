package com.knightdx91.websitebusiness.net

import org.json.JSONObject

/** One form message or request from a client's live site, the company website or an extras request (owner only). */
data class InboxItem(
    val id: String,
    val leadId: String?,
    val business: String?,
    val createdAt: Long,
    val read: Boolean,
    val data: JSONObject,
) {
    val name: String get() = data.optString("name", "")
    val phone: String? get() = data.str("phone")
    val email: String? get() = data.str("email")
    val message: String? get() = data.str("message")

    /** Opens a client, not the company inbox entry. */
    val clientLeadId: String? get() = leadId?.takeIf { it.isNotBlank() && it != "company" }

    /** What they asked for, in one line: the service, or the part + vehicle (Reserve a part), or the pickup items. Same as the web's `requestLine`. */
    val requestLine: String
        get() {
            val d = data
            val vehicle = listOf("year", "make", "model").mapNotNull { d.str(it) }.joinToString(" ").ifBlank { d.str("vehicle") ?: "" }
            val bits = listOfNotNull(
                d.str("service"), d.str("part"), vehicle.ifBlank { null }, d.str("items"), d.str("address"),
                d.str("best_day")?.let { "best day $it" }, d.str("town"), d.str("frequency"), d.str("home_size"), d.str("property"), d.str("quantity"),
            ).joinToString(" · ")
            val topic = d.str("topic")
            return if (topic != null) topic + (if (bits.isNotBlank()) ": $bits" else "") else bits
        }

    companion object {
        fun from(j: JSONObject) = InboxItem(
            id = j.optString("id"),
            leadId = j.str("leadId"),
            business = j.str("business"),
            createdAt = j.optLong("createdAt"),
            read = j.optBoolean("read"),
            data = j.optJSONObject("data") ?: JSONObject(),
        )
    }
}

/** One post the spam checks dropped (src/worker/spam.ts): who, where, why and a snippet. Nobody was alerted for it. */
data class BlockedPost(val at: Long, val scope: String, val reasons: List<String>, val who: String, val snippet: String)

/** The inbox plus this month's blocked-as-spam count and the last few, so "did you get my message?" can be checked. */
data class Inbox(val items: List<InboxItem>, val blockedThisMonth: Int, val blocked: List<BlockedPost>)

/** GET /api/inbox (owner only): newest first. */
suspend fun Api.inbox(): Inbox {
    val j = getJson("/inbox")
    val b = j.optJSONObject("blocked")
    return Inbox(
        items = j.optJSONArray("items").objects().map { InboxItem.from(it) },
        blockedThisMonth = b?.optInt("month") ?: 0,
        blocked = b?.optJSONArray("recent").objects().map { r ->
            BlockedPost(
                at = r.optLong("at"),
                scope = r.optString("scope"),
                reasons = r.optJSONArray("reasons")?.let { a -> (0 until a.length()).map { a.optString(it) } } ?: emptyList(),
                who = r.optString("who"),
                snippet = r.optString("snippet"),
            )
        },
    )
}

/** POST /api/inbox/:id/read */
suspend fun Api.inboxMarkRead(id: String) {
    postJson("/inbox/$id/read")
}
