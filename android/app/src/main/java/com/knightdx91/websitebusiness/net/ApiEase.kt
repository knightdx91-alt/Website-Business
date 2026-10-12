package com.knightdx91.websitebusiness.net

import android.os.Build
import com.knightdx91.websitebusiness.BuildConfig
import org.json.JSONObject

/**
 * Ease-of-use endpoints (Oct 2026): the Home queue, the Settings health strip, alert preferences, problem reports and the
 * Start-here card. Mirrors the web app; the words come from the server (src/worker/queue.ts).
 */

data class QueueRow(val lead: Lead, val step: Step)
data class Queue(val today: String, val rows: List<QueueRow>, val counts: Map<String, Int>)

suspend fun Api.queue(): Queue {
    val j = getJson("/queue")
    val counts = LinkedHashMap<String, Int>()
    j.optJSONObject("counts")?.let { c -> c.keys().forEach { k -> counts[k] = c.optInt(k) } }
    return Queue(
        j.optString("today"),
        j.optJSONArray("rows").objects().mapNotNull { r -> val st = Step.from(r.optJSONObject("step")) ?: return@mapNotNull null; QueueRow(Lead.from(r.optJSONObject("lead") ?: JSONObject()), st) },
        counts,
    )
}

/** One outside piece: ok / warn / off, one line, and the Settings section that fixes it (null = a Worker secret). */
data class HealthItem(val id: String, val label: String, val state: String, val detail: String, val section: String?)

suspend fun Api.health(): List<HealthItem> = getJson("/health").optJSONArray("items").objects().map {
    HealthItem(it.optString("id"), it.optString("label"), it.optString("state", "off"), it.optString("detail"), it.str("section"))
}

data class AlertMode(val id: String, val label: String, val about: String)
data class AlertPrefs(val mode: String, val modes: List<AlertMode>)

private fun prefsFrom(j: JSONObject) = AlertPrefs(j.optString("mode", "all"), j.optJSONArray("modes").objects().map { AlertMode(it.optString("id"), it.optString("label"), it.optString("about")) })
suspend fun Api.alertPrefs(): AlertPrefs = prefsFrom(getJson("/notifications/prefs"))
suspend fun Api.setAlertMode(mode: String): AlertPrefs = prefsFrom(putJson("/notifications/prefs", JSONObject().put("mode", mode)))

/** "Report this": the screen, what they were doing, the last failed request and the phone, for the owner to read. */
suspend fun Api.report(screen: String, step: String, message: String?, leadId: String? = null): String {
    val err = lastError?.takeIf { System.currentTimeMillis() - it.at < 2 * 60_000L }
    val body = JSONObject()
        .put("app", "android")
        .put("screen", screen.take(120))
        .put("message", (message ?: err?.message ?: "Something didn't work").take(1000))
        .put("device", "${Build.MANUFACTURER} ${Build.MODEL} · Android ${Build.VERSION.RELEASE} · app ${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})".take(200))
    if (step.isNotBlank()) body.put("step", step.take(120))
    if (err != null) body.put("detail", JSONObject().put("method", err.method).put("path", err.path).put("status", err.status).put("message", err.message).put("at", err.at).toString().take(4000))
    if (leadId != null) body.put("leadId", leadId)
    return postJson("/report", body).optString("id")
}

data class Problem(val id: String, val at: Long, val who: String?, val app: String, val screen: String?, val step: String?, val message: String, val detail: String?, val device: String?, val leadId: String?, val leadName: String?, val status: String)

suspend fun Api.problems(): List<Problem> = getJson("/problems").optJSONArray("problems").objects().map {
    Problem(it.optString("id"), it.optLong("at"), it.str("who"), it.optString("app"), it.str("screen"), it.str("step"), it.optString("message"), it.str("detail"), it.str("device"), it.str("leadId"), it.str("leadName"), it.optString("status", "open"))
}
suspend fun Api.problemDone(id: String, done: Boolean = true) { postJson("/problems/$id/${if (done) "done" else "reopen"}") }

suspend fun Api.startDismiss() { postJson("/start/dismiss") }
