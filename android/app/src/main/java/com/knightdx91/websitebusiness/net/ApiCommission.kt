package com.knightdx91.websitebusiness.net

import org.json.JSONArray
import org.json.JSONObject

/** The commission rules from Settings → Commission (src/worker/commission.ts). Percentages are 0–100. */
data class CommissionRules(
    val bonusMonths: Double, val setupPct: Double, val oneTimePct: Double, val quotePct: Double, val residualPct: Double,
    val residualCapMonths: Int, val openerPct: Double, val openerDays: Int, val clawbackDays: Int, val ownerEarns: Boolean, val teamPoolPct: Double,
) {
    companion object {
        fun from(j: JSONObject?) = CommissionRules(
            j?.optDouble("bonusMonths", 1.0) ?: 1.0, j?.optDouble("setupPct", 20.0) ?: 20.0, j?.optDouble("oneTimePct", 20.0) ?: 20.0,
            j?.optDouble("quotePct", 20.0) ?: 20.0, j?.optDouble("residualPct", 10.0) ?: 10.0, j?.optInt("residualCapMonths", 24) ?: 24,
            j?.optDouble("openerPct", 40.0) ?: 40.0, j?.optInt("openerDays", 30) ?: 30, j?.optInt("clawbackDays", 60) ?: 60,
            j?.optBoolean("ownerEarns", false) ?: false, j?.optDouble("teamPoolPct", 15.0) ?: 15.0,
        )
    }
}

data class CommissionPlanOption(val id: String, val label: String)
data class CommissionPlan(val id: String, val name: String, val monthly: Double, val options: List<CommissionPlanOption>)
data class CommissionAddon(val index: Int, val name: String, val unit: String, val priceText: String, val founderPick: Boolean)

/** One row of "every plan, no extras". Money in cents; -1 = no end. */
data class CommissionPlanRow(val plan: String, val billingLabel: String, val clientFirst: Long, val bonus: Long, val residualEach: Long, val interval: String, val yearOne: Long, val overCap: Long)
data class CommissionExtraRow(val name: String, val unit: String, val price: String, val bonus: Long, val residualEach: Long, val how: String)

data class CommissionSetup(
    val rules: CommissionRules,
    val plans: List<CommissionPlan>,
    val addons: List<CommissionAddon>,
    val churchYearly: Boolean,
    val planRows: List<CommissionPlanRow>,
    val extraRows: List<CommissionExtraRow>,
)

data class CommissionItem(val what: String, val kind: String, val price: String, val bonus: Long, val residual: Long, val how: String)
data class CommissionPayout(val role: String, val owner: Boolean, val keptByCompany: Boolean, val first: Long, val each: Long, val yearOne: Long, val overCap: Long)
data class CommissionQuote(
    val plan: String, val billingLabel: String, val interval: String, val clientFirst: Long, val clientEach: Long, val clientYearOne: Long,
    val items: List<CommissionItem>, val bonus: Long, val residualEach: Long, val payouts: List<CommissionPayout>,
    val stripeYearOne: Long, val paidOutYearOne: Long, val teamPoolYearOne: Long, val leftYearOne: Long, val notes: List<String>,
)


/** GET /api/commission (everyone). */
suspend fun Api.commissionSetup(): CommissionSetup {
    val j = getJson("/commission")
    val t = j.optJSONObject("table")
    return CommissionSetup(
        rules = CommissionRules.from(j.optJSONObject("rules")),
        plans = j.optJSONArray("plans").objects().map { p ->
            CommissionPlan(p.optString("id"), p.optString("name"), p.optDouble("monthly", 0.0), p.optJSONArray("options").objects().map { CommissionPlanOption(it.optString("id"), it.optString("label")) })
        },
        addons = j.optJSONArray("addons").objects().map { CommissionAddon(it.optInt("index"), it.optString("name"), it.optString("unit"), it.optString("priceText"), it.optBoolean("founderPick")) },
        churchYearly = j.optBoolean("churchYearly"),
        planRows = t?.optJSONArray("plans").objects().map {
            CommissionPlanRow(it.optString("plan"), it.optString("billingLabel"), it.optLong("clientFirst"), it.optLong("bonus"), it.optLong("residualEach"), it.optString("interval"), it.optLong("yearOne"), it.optLong("overCap"))
        },
        extraRows = t?.optJSONArray("extras").objects().map {
            CommissionExtraRow(it.optString("name"), it.optString("unit"), it.optString("price"), it.optLong("bonus"), it.optLong("residualEach"), it.optString("how"))
        },
    )
}

/** POST /api/commission/quote: picks are (extra index → quantity). */
suspend fun Api.commissionQuote(
    plan: String, billing: String, picks: Map<Int, Int>, founder: Int?, church: Boolean, quoteDollars: Double?, who: String, owner: String,
): CommissionQuote {
    val body = JSONObject().put("plan", plan).put("billing", billing).put("church", church).put("who", who).put("owner", owner)
        .put("picks", JSONArray().apply { picks.forEach { (i, q) -> put(JSONObject().put("index", i).put("qty", q)) } })
    if (founder != null) body.put("founder", founder)
    if (quoteDollars != null) body.put("quoteDollars", quoteDollars)
    val j = postJson("/commission/quote", body)
    val c = j.optJSONObject("company") ?: JSONObject()
    return CommissionQuote(
        plan = j.optString("plan"), billingLabel = j.optString("billingLabel"), interval = j.optString("interval"),
        clientFirst = j.optLong("clientFirst"), clientEach = j.optLong("clientEach"), clientYearOne = j.optLong("clientYearOne"),
        items = j.optJSONArray("items").objects().map { CommissionItem(it.optString("what"), it.optString("kind"), it.optString("price"), it.optLong("bonus"), it.optLong("residual"), it.optString("how")) },
        bonus = j.optLong("bonus"), residualEach = j.optLong("residualEach"),
        payouts = j.optJSONArray("payouts").objects().map { CommissionPayout(it.optString("role"), it.optBoolean("owner"), it.optBoolean("keptByCompany"), it.optLong("first"), it.optLong("each"), it.optLong("yearOne"), it.optLong("overCap")) },
        stripeYearOne = c.optLong("stripeYearOne"), paidOutYearOne = c.optLong("paidOutYearOne"), teamPoolYearOne = c.optLong("teamPoolYearOne"), leftYearOne = c.optLong("leftYearOne"),
        notes = j.optJSONArray("notes").strings(),
    )
}
