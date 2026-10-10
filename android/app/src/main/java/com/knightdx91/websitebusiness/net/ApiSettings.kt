package com.knightdx91.websitebusiness.net

import org.json.JSONObject

/** The settings screen's view of `GET /api/meta` (owner): the raw settings object plus what the form needs around it. */
class SettingsMeta(
    val meId: String,
    val settings: JSONObject,
    val models: List<ModelOption>,
    /** Standard contract terms per extra, same order as `settings.addons`. */
    val extraTerms: List<String>,
    val defaultTerms: String,
    val checkout: CheckoutInfo,
) {
    companion object {
        fun from(j: JSONObject): SettingsMeta {
            val c = j.optJSONObject("checkout") ?: JSONObject()
            return SettingsMeta(
                meId = j.optJSONObject("me")?.optString("id", "") ?: "",
                settings = j.optJSONObject("settings") ?: JSONObject(),
                models = j.optJSONArray("models").objects().map { ModelOption(it.optString("id"), it.optString("label", it.optString("id"))) },
                extraTerms = j.optJSONArray("extraTerms").strings(),
                defaultTerms = j.optString("defaultTerms", ""),
                checkout = CheckoutInfo(c.optBoolean("online"), c.optBoolean("webhook"), c.optBoolean("email")),
            )
        }
    }
}

data class ModelOption(val id: String, val label: String)

data class CheckoutInfo(val online: Boolean, val webhook: Boolean, val email: Boolean)

data class Caller(val id: String, val name: String, val disabled: Boolean, val admin: Boolean, val email: String?, val googleOnly: Boolean) {
    companion object {
        fun from(j: JSONObject) = Caller(j.optString("id"), j.optString("name", ""), j.optBoolean("disabled"), j.optBoolean("admin"), j.str("email"), j.optBoolean("googleOnly"))
    }
}

data class Usage(val aiCost: Double, val aiTokensIn: Long, val aiTokensOut: Long, val googleCostEstimate: Double, val googleRequests: Long, val googlePhotos: Long) {
    companion object {
        fun from(j: JSONObject): Usage {
            val u = j.optJSONObject("last30Days") ?: JSONObject()
            return Usage(u.optDouble("aiCost", 0.0), u.optLong("aiTokensIn", 0L), u.optLong("aiTokensOut", 0L), u.optDouble("googleCostEstimate", 0.0), u.optLong("googleRequests", 0L), u.optLong("googlePhotos", 0L))
        }
    }
}

data class MailTestResult(val ok: Boolean, val provider: String?, val to: String?, val error: String?)

/** `GET /api/meta` with the full settings object (the owner's view). */
suspend fun Api.settingsMeta(): SettingsMeta = SettingsMeta.from(getJson("/meta"))

/** `PUT /api/settings`: the whole settings object at once, built field for field like the web form. */
suspend fun Api.saveSettings(body: JSONObject): JSONObject = putJson("/settings", body)

suspend fun Api.usage(): Usage = Usage.from(getJson("/usage"))

suspend fun Api.callers(): List<Caller> = getJson("/callers").optJSONArray("callers").objects().map { Caller.from(it) }

suspend fun Api.addCaller(name: String, password: String?, email: String?, admin: Boolean): JSONObject {
    val b = JSONObject().put("name", name).put("admin", admin)
    if (!password.isNullOrBlank()) b.put("password", password)
    if (!email.isNullOrBlank()) b.put("email", email)
    return postJson("/callers", b)
}

/** `change` carries any of: name, password, disabled, admin, email (JSONObject.NULL removes the email). */
suspend fun Api.updateCaller(id: String, change: JSONObject): JSONObject = putJson("/callers/$id", change)

suspend fun Api.removeCaller(id: String): JSONObject = deleteJson("/callers/$id")

suspend fun Api.mailTest(): MailTestResult {
    val r = postJson("/mail/test")
    return MailTestResult(r.optBoolean("ok"), r.str("provider"), r.str("to"), r.str("error"))
}

/** The whole database as one JSON file (owner). */
suspend fun Api.backup(): ByteArray = bytes("/api/backup")
