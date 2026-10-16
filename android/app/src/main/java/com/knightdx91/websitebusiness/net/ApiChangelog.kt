package com.knightdx91.websitebusiness.net

import org.json.JSONObject

/** One entry of the team change log (src/worker/changelog.ts). */
data class ChangeEntry(val n: Int, val date: String, val android: String?, val title: String, val items: List<String>) {
    companion object {
        fun from(j: JSONObject) = ChangeEntry(
            n = j.optInt("n"),
            date = j.optString("date"),
            android = if (j.isNull("android")) null else j.optString("android").ifBlank { null },
            title = j.optString("title"),
            items = j.optJSONArray("items").strings(),
        )
    }
}

data class Changelog(val latest: Int, val seen: Int?, val entries: List<ChangeEntry>, val unseen: List<ChangeEntry>)

/** `since` = an Android version name: only what builds newer than it brought (the Update available pop-up). */
suspend fun Api.changelog(since: String? = null): Changelog {
    val j = getJson(if (since != null) "/changelog?since=${java.net.URLEncoder.encode(since, "UTF-8")}" else "/changelog")
    return Changelog(
        latest = j.optInt("latest"),
        seen = if (j.isNull("seen") || !j.has("seen")) null else j.optInt("seen"),
        entries = j.optJSONArray("entries").objects().map { ChangeEntry.from(it) },
        unseen = j.optJSONArray("unseen").objects().map { ChangeEntry.from(it) },
    )
}

suspend fun Api.changelogSeen() { postJson("/changelog/seen") }
