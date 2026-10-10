package com.knightdx91.websitebusiness.net

import android.content.Context
import com.knightdx91.websitebusiness.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

/** The Worker's JSON API, same routes the web app uses, with the session as a Bearer token. */
class Api(context: Context) {
    val prefs = Prefs(context)
    val origin: String = BuildConfig.BASE_URL

    class ApiException(message: String, val status: Int) : IOException(message)
    class Unauthorized : IOException("Please sign in again")

    // ---- plumbing ----

    private suspend fun call(method: String, path: String, body: JSONObject? = null, auth: Boolean = true): Response = withContext(Dispatchers.IO) {
        val conn = URL(origin + "/api" + path).openConnection() as HttpURLConnection
        try {
            conn.requestMethod = method
            conn.connectTimeout = 15_000
            conn.readTimeout = 60_000
            conn.instanceFollowRedirects = false
            conn.setRequestProperty("Accept", "application/json")
            conn.setRequestProperty("x-wb", "1")
            if (auth) prefs.token?.let { conn.setRequestProperty("Authorization", "Bearer $it") }
            if (body != null) {
                conn.doOutput = true
                conn.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                conn.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
            } else if (method != "GET") {
                conn.doOutput = true
                conn.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                conn.outputStream.use { it.write("{}".toByteArray(Charsets.UTF_8)) }
            }
            val status = conn.responseCode
            val stream = if (status < 400) conn.inputStream else conn.errorStream
            val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: ""
            val cookies = conn.headerFields.entries.firstOrNull { it.key?.equals("set-cookie", true) == true }?.value ?: emptyList()
            if (status == 401 && auth) throw Unauthorized()
            if (status >= 400) {
                val msg = try { JSONObject(text).optString("error", "") } catch (e: Exception) { "" }
                throw ApiException(msg.ifBlank { "Server error $status" }, status)
            }
            Response(text, cookies)
        } finally {
            conn.disconnect()
        }
    }

    class Response(val text: String, val cookies: List<String>) {
        fun json(): JSONObject = if (text.isBlank()) JSONObject() else JSONObject(text)
    }

    private suspend fun get(path: String) = call("GET", path).json()
    private suspend fun post(path: String, body: JSONObject? = null) = call("POST", path, body).json()
    private suspend fun put(path: String, body: JSONObject) = call("PUT", path, body).json()
    private suspend fun delete(path: String) = call("DELETE", path).json()

    private fun q(vararg pairs: Pair<String, String?>): String {
        val parts = pairs.filter { !it.second.isNullOrBlank() }.map { "${it.first}=${URLEncoder.encode(it.second, "UTF-8")}" }
        return if (parts.isEmpty()) "" else "?" + parts.joinToString("&")
    }

    // ---- sign in ----

    suspend fun authConfig(): AuthConfig = AuthConfig.from(call("GET", "/auth/config", auth = false).json())

    /** Google sign-in: the server checks the ID token and answers with the session token. */
    suspend fun googleLogin(idToken: String): JSONObject = call("POST", "/auth/google", JSONObject().put("idToken", idToken), auth = false).json()

    /** Password login: the server only sets a cookie, so the token is read from the Set-Cookie header. */
    suspend fun passwordLogin(password: String): String {
        val r = call("POST", "/auth/login", JSONObject().put("password", password), auth = false)
        val cookie = r.cookies.firstOrNull { it.startsWith("wb_session=") } ?: throw ApiException("No session came back", 500)
        return cookie.removePrefix("wb_session=").substringBefore(";")
    }

    suspend fun logout() { runCatching { post("/auth/logout") } }

    // ---- data ----

    suspend fun meta(): Meta = Meta.from(get("/meta"))

    suspend fun leads(sales: String? = null, callbacks: String? = null, category: String? = null, opened: String? = null): List<Lead> =
        get("/leads" + q("sales" to sales, "callbacks" to callbacks, "category" to category, "opened" to opened)).optJSONArray("leads").objects().map { Lead.from(it) }

    suspend fun lead(id: String): LeadDetail = LeadDetail.from(get("/leads/$id"))

    suspend fun logCall(id: String, outcome: String, note: String, followUp: String?): JSONObject {
        val b = JSONObject().put("outcome", outcome).put("note", note)
        if (followUp != null) b.put("followUp", followUp)
        return post("/leads/$id/log", b)
    }

    suspend fun setStatus(id: String, salesStatus: String) = post("/leads/$id/status", JSONObject().put("salesStatus", salesStatus))

    suspend fun shareLink(id: String): String = post("/leads/$id/share").optString("url")

    suspend fun pitch(id: String, generate: Boolean): Pitch? {
        val j = if (generate) post("/leads/$id/pitch") else get("/leads/$id/pitch")
        return j.optJSONObject("pitch")?.let { Pitch.from(it) }
    }

    suspend fun signupLink(id: String, plan: String): JSONObject = post("/leads/$id/signup", JSONObject().put("plan", plan))

    suspend fun startTap(id: String, signupId: String): JSONObject = post("/leads/$id/tap", JSONObject().put("signupId", signupId))

    suspend fun contact(id: String, contact: String?, bestTime: String?): JSONObject {
        val b = JSONObject()
        if (contact != null) b.put("contact", contact)
        if (bestTime != null) b.put("bestTime", bestTime)
        return put("/leads/$id/contact", b)
    }

    suspend fun notifications(): Notifications = Notifications.from(get("/notifications"))
    suspend fun notificationsSeen() = post("/notifications/seen")
    suspend fun unreadCount(): Int = get("/notifications/count").optInt("unread", 0)

    suspend fun tasks(scope: String = "open", leadId: String? = null): List<Task> =
        get("/tasks" + q("scope" to scope, "lead" to leadId)).optJSONArray("tasks").objects().map { Task.from(it) }

    suspend fun addTask(title: String, notes: String, due: String?, dueTime: String?, assignee: String?, leadId: String?): Task {
        val b = JSONObject().put("title", title).put("notes", notes)
        if (due != null) b.put("due", due)
        if (dueTime != null) b.put("dueTime", dueTime)
        if (assignee != null) b.put("assignee", assignee)
        if (leadId != null) b.put("leadId", leadId)
        return Task.from(post("/tasks", b).getJSONObject("task"))
    }

    suspend fun setTaskDone(id: String, done: Boolean) = put("/tasks/$id", JSONObject().put("done", done))
    suspend fun deleteTask(id: String) = delete("/tasks/$id")

    suspend fun runs(): List<RunInfo> = get("/runs").optJSONArray("runs").objects().map { RunInfo.from(it) }
    suspend fun startRun(categories: List<String>, cap: Int, wider: Boolean, badSites: Boolean): JSONObject =
        post("/runs", JSONObject().put("categories", JSONArray(categories)).put("cap", cap).put("wider", wider).put("badSites", badSites))
    suspend fun dismissRun(id: String) = post("/runs/$id/dismiss")

    suspend fun tapStatus(): TapStatus = TapStatus.from(get("/tap/status"))
    suspend fun tapSetup(): JSONObject = post("/tap/setup")

    suspend fun androidVersion(): JSONObject = get("/android/version")
}

fun JSONArray?.objects(): List<JSONObject> {
    if (this == null) return emptyList()
    val out = ArrayList<JSONObject>(length())
    for (i in 0 until length()) optJSONObject(i)?.let { out.add(it) }
    return out
}

fun JSONArray?.strings(): List<String> {
    if (this == null) return emptyList()
    val out = ArrayList<String>(length())
    for (i in 0 until length()) out.add(optString(i))
    return out
}

fun JSONObject.str(key: String): String? = if (isNull(key)) null else optString(key).takeIf { it.isNotEmpty() }
