package com.knightdx91.websitebusiness.net

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/** One row of the week / month table: calls logged by one person. */
data class SalesRow(val person: String, val calls: Int, val reached: Int, val interested: Int, val sold: Int)

data class CommissionOwed(val person: String, val sales: Int, val amount: Double)

data class SalesClient(val id: String, val name: String, val status: String, val plan: String?, val monthly: Double, val paid: Boolean, val seller: String?)

/** Someone who bought from "Get started" on the company website (sign-ups with lead id 'web'). */
data class WebsiteOrder(
    val id: String,
    val business: String?,
    val name: String?,
    val phone: String?,
    val email: String?,
    val plan: String,
    val extras: List<String>,
    val dueCents: Long,
    val paid: Boolean,
    val createdAt: Long,
)

/** One step of the funnel: how many leads ever got here, the share of the step before, and the typical days between. */
data class FunnelStage(val id: String, val label: String, val count: Int, val rate: Double?, val medianDays: Double?)

/** GET /api/sales (owner only). Money is in dollars, like the web app; `dueCents` is cents. */
data class SalesData(
    val week: List<SalesRow>,
    val month: List<SalesRow>,
    val commission: Double,
    val commissionOwed: List<CommissionOwed>,
    val clients: List<SalesClient>,
    val monthlyRevenue: Double,
    val signedRevenue: Double,
    val lostReasons: Map<String, Int>,
    val pipelineShown: Int?,
    val pipelineMonthlyIfPlus: Double?,
    val websiteOrders: List<WebsiteOrder>,
    val funnel: List<FunnelStage> = emptyList(),
) {
    companion object {
        private fun rows(j: JSONObject, key: String) = j.optJSONArray(key).objects().map {
            SalesRow(it.optString("person"), it.optInt("calls"), it.optInt("reached"), it.optInt("interested"), it.optInt("sold"))
        }

        fun from(j: JSONObject): SalesData {
            val lost = LinkedHashMap<String, Int>()
            j.optJSONObject("lostReasons")?.let { o -> o.keys().forEach { k -> lost[k] = o.optInt(k) } }
            val pipe = j.optJSONObject("pipeline")
            return SalesData(
                week = rows(j, "week"),
                month = rows(j, "month"),
                commission = j.optDouble("commission", 0.0),
                commissionOwed = j.optJSONArray("commissionOwed").objects().map { CommissionOwed(it.optString("person"), it.optInt("sales"), it.optDouble("amount", 0.0)) },
                clients = j.optJSONArray("clients").objects().map {
                    SalesClient(it.optString("id"), it.optString("name", ""), it.optString("status"), it.str("plan"), it.optDouble("monthly", 0.0), it.optBoolean("paid"), it.str("seller"))
                },
                monthlyRevenue = j.optDouble("monthlyRevenue", 0.0),
                signedRevenue = j.optDouble("signedRevenue", 0.0),
                lostReasons = lost,
                pipelineShown = pipe?.optInt("shown"),
                pipelineMonthlyIfPlus = if (pipe == null || pipe.isNull("monthlyIfPlus")) null else pipe.optDouble("monthlyIfPlus"),
                funnel = j.optJSONArray("funnel").objects().map {
                    FunnelStage(it.optString("id"), it.optString("label"), it.optInt("count"), if (it.isNull("rate")) null else it.optDouble("rate"), if (it.isNull("medianDays")) null else it.optDouble("medianDays"))
                },
                websiteOrders = j.optJSONArray("websiteOrders").objects().map {
                    WebsiteOrder(
                        id = it.optString("id"),
                        business = it.str("business"),
                        name = it.str("name"),
                        phone = it.str("phone"),
                        email = it.str("email"),
                        plan = it.optString("plan", ""),
                        extras = it.optJSONArray("extras").strings(),
                        dueCents = it.optLong("dueCents", 0L),
                        paid = it.optBoolean("paid"),
                        createdAt = it.optLong("createdAt"),
                    )
                },
            )
        }
    }
}

suspend fun Api.sales(): SalesData = SalesData.from(getJson("/sales"))

/**
 * The client's Stripe billing portal: `GET /api/leads/:id/portal` answers with a 303 to Stripe (or a JSON error when there is
 * no Stripe customer yet). Reads the redirect target so the app can open it in the browser; the web app does the same peek.
 */
suspend fun Api.portalUrl(leadId: String): String = withContext(Dispatchers.IO) {
    val conn = URL("$origin/api/leads/$leadId/portal").openConnection() as HttpURLConnection
    try {
        conn.requestMethod = "GET"
        conn.instanceFollowRedirects = false
        conn.connectTimeout = 15_000
        conn.readTimeout = 30_000
        conn.setRequestProperty("Accept", "application/json")
        conn.setRequestProperty("x-wb", "1")
        prefs.token?.let { conn.setRequestProperty("Authorization", "Bearer $it") }
        val status = conn.responseCode
        if (status == 401) throw Api.Unauthorized()
        if (status in 300..399) {
            val loc = conn.getHeaderField("Location")
            if (!loc.isNullOrBlank()) return@withContext loc
        }
        val text = (if (status < 400) conn.inputStream else conn.errorStream)?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: ""
        if (status == 404) throw Api.ApiException("The billing portal isn't available yet.", status)
        val msg = runCatching { JSONObject(text).optString("error", "") }.getOrDefault("")
        throw Api.ApiException(msg.ifBlank { "No Stripe customer on file for this client yet." }, status)
    } finally {
        conn.disconnect()
    }
}
