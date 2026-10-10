package com.knightdx91.websitebusiness.net

import org.json.JSONObject

data class AuthConfig(val googleClientId: String?, val domain: String, val requireGoogle: Boolean, val hasOwner: Boolean) {
    companion object {
        fun from(j: JSONObject) = AuthConfig(j.str("googleClientId"), j.optString("domain", "undergroundassociates.com"), j.optBoolean("requireGoogle"), j.optBoolean("hasOwner", true))
    }
}

data class Plan(val id: String, val name: String, val monthly: Double, val setup: Double, val includes: String)

data class Category(val id: String, val label: String, val category: String, val searches: Int, val widerSearches: Int)

data class TeamMember(val id: String, val name: String)

data class Meta(
    val meName: String,
    val meRole: String,
    val meId: String,
    val companyName: String,
    val callerName: String,
    val plans: List<Plan>,
    val categories: List<Category>,
    val team: List<TeamMember>,
    val defaultCap: Int,
    val dailyCalls: Int,
    val tapReady: Boolean,
    val tapWhy: String?,
    val checkoutOnline: Boolean,
) {
    val isOwner get() = meRole == "owner"

    companion object {
        fun from(j: JSONObject): Meta {
            val me = j.optJSONObject("me") ?: JSONObject()
            val s = j.optJSONObject("settings") ?: JSONObject()
            val tap = j.optJSONObject("tap") ?: JSONObject()
            return Meta(
                meName = me.optString("name", ""),
                meRole = me.optString("role", "caller"),
                meId = me.optString("id", ""),
                companyName = s.optString("companyName", ""),
                callerName = s.optString("callerName", ""),
                plans = s.optJSONArray("plans").objects().map { Plan(it.optString("id"), it.optString("name"), it.optDouble("monthly", 0.0), it.optDouble("setup", 0.0), it.optString("includes")) },
                categories = j.optJSONArray("categories").objects().map { Category(it.optString("id"), it.optString("label"), it.optString("category"), it.optInt("searches"), it.optInt("widerSearches")) },
                team = j.optJSONArray("team").objects().map { TeamMember(it.optString("id"), it.optString("name")) },
                defaultCap = s.optInt("defaultCap", 50),
                dailyCalls = s.optInt("dailyCalls", 0),
                tapReady = tap.optBoolean("ready"),
                tapWhy = tap.str("why"),
                checkoutOnline = j.optJSONObject("checkout")?.optBoolean("online") ?: false,
            )
        }
    }
}

data class Lead(
    val id: String,
    val category: String,
    val name: String,
    val phone: String?,
    val address: String?,
    val rating: Double?,
    val reviewCount: Int,
    val presence: String?,
    val reason: String?,
    val score: Double,
    val status: String,
    val salesStatus: String,
    val liveUrl: String?,
    val hasPitch: Boolean,
    val followUp: String?,
    val lastContact: Long?,
    val previewOpens: Int,
    val previewOpenedAt: Long?,
    val contact: String?,
    val bestTime: String?,
    val unpaidSignup: Boolean,
    val todos: Int,
    val blockers: Int?,
    val lat: Double?,
    val lng: Double?,
) {
    val ready get() = status == "ready"

    companion object {
        fun from(j: JSONObject) = Lead(
            id = j.optString("id"),
            category = j.optString("category"),
            name = j.optString("name", ""),
            phone = j.str("phone"),
            address = j.str("address"),
            rating = if (j.isNull("rating")) null else j.optDouble("rating"),
            reviewCount = j.optInt("reviewCount", 0),
            presence = j.str("presence"),
            reason = j.str("reason"),
            score = j.optDouble("score", 0.0),
            status = j.optString("status", "queued"),
            salesStatus = j.optString("salesStatus", "new"),
            liveUrl = j.str("liveUrl"),
            hasPitch = j.optBoolean("hasPitch"),
            followUp = j.str("followUp"),
            lastContact = if (j.isNull("lastContact")) null else j.optLong("lastContact"),
            previewOpens = j.optInt("previewOpens", 0),
            previewOpenedAt = if (j.isNull("previewOpenedAt")) null else j.optLong("previewOpenedAt"),
            contact = j.str("contact"),
            bestTime = j.str("bestTime"),
            unpaidSignup = j.optBoolean("unpaidSignup"),
            todos = j.optInt("todos", 0),
            blockers = if (j.isNull("blockers")) null else j.optInt("blockers"),
            lat = if (j.isNull("lat")) null else j.optDouble("lat"),
            lng = if (j.isNull("lng")) null else j.optDouble("lng"),
        )
    }
}

data class Note(val id: String, val author: String, val outcome: String?, val body: String, val createdAt: Long)

data class Signup(
    val id: String,
    val planName: String,
    val billingLabel: String?,
    val billingDetail: String?,
    val signerName: String,
    val signerEmail: String?,
    val paid: Boolean,
    val createdAt: Long,
    val dueCents: Long,
    val extras: List<String>,
    val invoice: Boolean,
)

data class LeadDetail(val lead: Lead, val notes: List<Note>, val signups: List<Signup>, val cadenceNext: String?, val variantLabel: String?) {
    companion object {
        fun from(j: JSONObject): LeadDetail {
            val notes = j.optJSONArray("notes").objects().map { Note(it.optString("id"), it.optString("author"), it.str("outcome"), it.optString("body"), it.optLong("createdAt")) }
            val signups = j.optJSONArray("signups").objects().map { s ->
                val plan = s.optJSONObject("plan") ?: JSONObject()
                val x = s.optJSONObject("extras")
                val names = ArrayList<String>()
                x?.optJSONArray("extras").objects().forEach { e -> names.add(if (e.optInt("qty", 1) > 1) "${e.optString("name")} ×${e.optInt("qty")}" else e.optString("name")) }
                x?.optJSONArray("quotes").strings().forEach { names.add("$it (quote)") }
                Signup(
                    id = s.optString("id"),
                    planName = plan.optString("name", "Plan"),
                    billingLabel = plan.str("billingLabel"),
                    billingDetail = plan.str("billingDetail"),
                    signerName = s.optString("signerName", ""),
                    signerEmail = s.str("signerEmail"),
                    paid = s.optBoolean("paid"),
                    createdAt = s.optLong("createdAt"),
                    dueCents = s.optLong("dueCents", 0L),
                    extras = names,
                    invoice = x?.optBoolean("invoice") ?: false,
                )
            }
            val cadence = j.optJSONObject("cadence")
            return LeadDetail(Lead.from(j), notes, signups, cadence?.str("next") ?: cadence?.str("label"), j.str("variantLabel"))
        }
    }
}

data class Pitch(
    val opener: String,
    val whyItMatters: List<String>,
    val whatWeBuilt: List<String>,
    val questionsToAsk: List<String>,
    val objections: List<Pair<String, String>>,
    val close: String,
    val avoid: List<String>,
) {
    companion object {
        fun from(j: JSONObject) = Pitch(
            opener = j.optString("opener"),
            whyItMatters = j.optJSONArray("whyItMatters").strings(),
            whatWeBuilt = j.optJSONArray("whatWeBuilt").strings(),
            questionsToAsk = j.optJSONArray("questionsToAsk").strings(),
            objections = j.optJSONArray("objections").objects().map { it.optString("objection") to it.optString("response") },
            close = j.optString("close"),
            avoid = j.optJSONArray("avoid").strings(),
        )
    }
}

data class EventItem(val id: String, val at: Long, val kind: String, val text: String, val who: String?, val leadId: String?, val leadName: String?, val unread: Boolean)

data class Notifications(val unread: Int, val items: List<EventItem>) {
    companion object {
        fun from(j: JSONObject) = Notifications(
            j.optInt("unread", 0),
            j.optJSONArray("items").objects().map { EventItem(it.optString("id"), it.optLong("at"), it.optString("kind"), it.optString("text"), it.str("who"), it.str("leadId"), it.str("leadName"), it.optBoolean("unread")) },
        )
    }
}

data class Task(
    val id: String,
    val title: String,
    val notes: String,
    val due: String?,
    val dueTime: String?,
    val assignee: String?,
    val assigneeName: String?,
    val leadId: String?,
    val leadName: String?,
    val createdByName: String?,
    val doneAt: Long?,
) {
    companion object {
        fun from(j: JSONObject) = Task(
            id = j.optString("id"),
            title = j.optString("title"),
            notes = j.optString("notes", ""),
            due = j.str("due"),
            dueTime = j.str("dueTime"),
            assignee = j.str("assignee"),
            assigneeName = j.str("assigneeName"),
            leadId = j.str("leadId"),
            leadName = j.str("leadName"),
            createdByName = j.str("createdByName"),
            doneAt = if (j.isNull("doneAt")) null else j.optLong("doneAt"),
        )
    }
}

data class RunInfo(
    val id: String,
    val createdAt: Long,
    val categories: List<String>,
    val searchesDone: Int,
    val searchesTotal: Int,
    val ready: Int,
    val failed: Int,
    val total: Int,
    val done: Boolean,
    val stalled: Boolean,
) {
    companion object {
        fun from(j: JSONObject): RunInfo {
            val c = j.optJSONObject("counts") ?: JSONObject()
            var total = 0
            c.keys().forEach { total += c.optInt(it) }
            return RunInfo(
                id = j.optString("id"),
                createdAt = j.optLong("createdAt"),
                categories = j.optJSONArray("categories").strings(),
                searchesDone = j.optInt("searchesDone"),
                searchesTotal = j.optInt("searchesTotal"),
                ready = c.optInt("ready"),
                failed = c.optInt("failed"),
                total = total,
                done = j.optBoolean("done"),
                stalled = j.optBoolean("stalled"),
            )
        }
    }
}

data class TapStatus(val ready: Boolean, val why: String?, val locationId: String?, val address: String?) {
    companion object {
        fun from(j: JSONObject) = TapStatus(j.optBoolean("ready"), j.str("why"), j.str("locationId"), j.str("address"))
    }
}
