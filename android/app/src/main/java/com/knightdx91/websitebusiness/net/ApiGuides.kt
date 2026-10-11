package com.knightdx91.websitebusiness.net

import org.json.JSONObject

data class GuideSection(val title: String, val steps: List<String>, val numbered: Boolean, val note: String?)

data class Guide(val id: String, val title: String, val intro: String, val sections: List<GuideSection>)

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
