package com.knightdx91.websitebusiness.net

import org.json.JSONArray
import org.json.JSONObject

/** 💵 Costs & usage: `GET /api/costs` (owner and full access) and the edits `PUT /api/costs`. One source with the web app. */
data class UsageLine(val metric: String, val label: String, val unit: String, val unitCents: Double, val freeQty: Long, val note: String?, val month: Long, val lastMonth: Long, val estCents: Double, val freeUsed: Double?)

data class ServiceReport(
    val id: String, val emoji: String, val name: String, val what: String, val kind: String, val monthlyCents: Long?, val renewEvery: String?,
    val perMonthCents: Double, val renews: String?, val url: String?, val account: String?, val notes: String?, val ifItStops: String, val tip: String?,
    val usage: List<UsageLine>, val warnings: List<String>,
)

data class CostsReport(val month: String, val lastMonth: String, val budgetCents: Long, val fixedCents: Long, val usageCents: Long, val feesCents: Long, val outCents: Long, val revenueCents: Long, val signedRevenueCents: Long, val warnings: List<String>, val services: List<ServiceReport>) {
    companion object {
        private fun strings(a: JSONArray?): List<String> = if (a == null) emptyList() else (0 until a.length()).map { a.getString(it) }
        private fun JSONObject.str(k: String): String? = if (isNull(k)) null else optString(k).takeIf { it.isNotEmpty() }
        fun from(j: JSONObject): CostsReport {
            val t = j.optJSONObject("totals") ?: JSONObject()
            val services = j.optJSONArray("services") ?: JSONArray()
            return CostsReport(
                month = j.optString("month"), lastMonth = j.optString("lastMonth"), budgetCents = j.optLong("budgetCents"),
                fixedCents = t.optLong("fixedCents"), usageCents = t.optLong("usageCents"), feesCents = t.optLong("feesCents"), outCents = t.optLong("outCents"),
                revenueCents = t.optLong("revenueCents"), signedRevenueCents = t.optLong("signedRevenueCents"), warnings = strings(j.optJSONArray("warnings")),
                services = (0 until services.length()).map { i ->
                    val s = services.getJSONObject(i)
                    val usage = s.optJSONArray("usage") ?: JSONArray()
                    ServiceReport(
                        id = s.optString("id"), emoji = s.optString("emoji"), name = s.optString("name"), what = s.optString("what"), kind = s.optString("kind"),
                        monthlyCents = if (s.isNull("monthlyCents")) null else s.optLong("monthlyCents"), renewEvery = s.str("renewEvery"), perMonthCents = s.optDouble("perMonthCents", 0.0),
                        renews = s.str("renews"), url = s.str("url"), account = s.str("account"), notes = s.str("notes"), ifItStops = s.optString("ifItStops"), tip = s.str("tip"),
                        usage = (0 until usage.length()).map { k ->
                            val u = usage.getJSONObject(k)
                            UsageLine(u.optString("metric"), u.optString("label"), u.optString("unit"), u.optDouble("unitCents", 0.0), u.optLong("freeQty"), u.str("note"), u.optLong("month"), u.optLong("lastMonth"), u.optDouble("estCents", 0.0), if (u.isNull("freeUsed")) null else u.optDouble("freeUsed"))
                        },
                        warnings = strings(s.optJSONArray("warnings")),
                    )
                },
            )
        }
    }
}

suspend fun Api.costs(): CostsReport = CostsReport.from(getJson("/costs"))

/** `body` is the same shape the web screen sends: {services: {id: {monthlyCents, renews, account, notes}}, rates: {metric: {unitCents, freeQty}}, budgetCents}. */
suspend fun Api.saveCosts(body: JSONObject): CostsReport = CostsReport.from(putJson("/costs", body))
