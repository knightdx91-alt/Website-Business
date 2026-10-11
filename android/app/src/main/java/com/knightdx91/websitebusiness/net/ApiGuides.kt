package com.knightdx91.websitebusiness.net

import org.json.JSONObject

data class GuideSection(val title: String, val steps: List<String>, val numbered: Boolean, val note: String?)

data class Guide(val id: String, val title: String, val intro: String, val sections: List<GuideSection>)

data class CustomerPitch(val title: String, val lead: String, val sections: List<GuideSection>, val price: List<String>, val fine: String, val displayUrl: String, val live: Boolean, val phone: String?)

/** `POST /api/leads/<id>/boardlink`: the public, texted version of the Tank board page (30 days) and a ready-to-send text. */
suspend fun Api.boardLink(leadId: String): Pair<String, String> = postJson("/leads/$leadId/boardlink").let { it.optString("url") to it.optString("text") }

/** `GET /api/leads/<id>/showboard`: the customer-facing Tank board page for a shop (owner and callers). */
suspend fun Api.showBoard(leadId: String): CustomerPitch {
    val j: JSONObject = getJson("/leads/$leadId/showboard")
    return CustomerPitch(
        title = j.optString("title"), lead = j.optString("lead"),
        sections = j.optJSONArray("sections").objects().map { s -> GuideSection(s.optString("title"), s.optJSONArray("steps").strings(), s.optBoolean("numbered"), s.optString("note").ifBlank { null }) },
        price = j.optJSONArray("price").strings(), fine = j.optString("fine"), displayUrl = j.optString("displayUrl"), live = j.optBoolean("live"), phone = j.optString("phone").ifBlank { null },
    )
}

/** `GET /api/guides/<id>`: a how-to (Settings → Guides), prices filled from Settings on the server. */
suspend fun Api.guide(id: String): Guide {
    val j: JSONObject = getJson("/guides/$id")
    return Guide(
        id = j.optString("id"),
        title = j.optString("title"),
        intro = j.optString("intro"),
        sections = j.optJSONArray("sections").objects().map { s ->
            GuideSection(s.optString("title"), s.optJSONArray("steps").strings(), s.optBoolean("numbered"), s.optString("note").ifBlank { null })
        },
    )
}
