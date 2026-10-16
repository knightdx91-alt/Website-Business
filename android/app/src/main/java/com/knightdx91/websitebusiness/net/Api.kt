package com.knightdx91.websitebusiness.net

import android.content.Context
import com.knightdx91.websitebusiness.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.Inet6Address
import okhttp3.Dns
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.net.URLEncoder
import java.util.concurrent.TimeUnit

/** The Worker's JSON API, same routes the web app uses, with the session as a Bearer token. */
class Api(context: Context) {
    val app: Context = context.applicationContext
    val prefs = Prefs(context)
    val origin: String = BuildConfig.BASE_URL

    class ApiException(message: String, val status: Int) : IOException(message)
    class Unauthorized : IOException("Please sign in again")

    /** The last failed request, so "Report a problem" can send it along without anyone retyping it. */
    data class LastError(val at: Long, val method: String, val path: String, val status: Int, val message: String)
    @Volatile var lastError: LastError? = null

    companion object {
        private val JSON = "application/json; charset=utf-8".toMediaType()

        const val SECURE_FAIL = "Couldn't make a secure connection to the app's server. Check that the phone's date and time are set automatically, then try again. On public or work Wi-Fi, try mobile data instead. If it keeps happening, report it from Settings."
        /** The raw TLS error behind the last SECURE_FAIL, for problem reports. */
        @Volatile var lastSecureError: String? = null

        /**
         * One client for the whole app. Connections are pooled and HTTP/2 carries parallel requests over one TLS handshake,
         * and IPv4-first DNS keeps a dead IPv6 route from being tried first, so a dead route costs nothing.
         * Before this (2.16 and earlier) every call opened its own connection, closed it, and could wait 15 s per address
         * in turn: a cold start of the app took up to half a minute on some networks.
         */
        val http: OkHttpClient by lazy {
            OkHttpClient.Builder()
                // IPv4 first: a dead IPv6 route used to cost a full connect timeout per address (OkHttp 5's fastFallback did
                // this, but Stripe Terminal 6.0.0 needs OkHttp 4.12 and crashes on 5.x: NoClassDefFoundError okhttp3.internal.Util).
                .dns(Ipv4First)
                // A failed secure connection says what to try instead of "java.security.cert.CertPathValidatorException…".
                .addInterceptor { chain ->
                    try { chain.proceed(chain.request()) } catch (e: javax.net.ssl.SSLException) {
                        lastSecureError = "${e.javaClass.simpleName}: ${e.message}"
                        throw IOException(SECURE_FAIL, e)
                    }
                }
                .connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(60, TimeUnit.SECONDS)
                .writeTimeout(60, TimeUnit.SECONDS)
                .followRedirects(false)
                .build()
        }
    }

    // ---- plumbing ----

    /** One JSON request to `/api<path>`. Screens use the typed helpers below or the getJson/postJson/putJson/deleteJson shortcuts. */
    suspend fun call(method: String, path: String, body: JSONObject? = null, auth: Boolean = true): Response = withContext(Dispatchers.IO) {
        val b = Request.Builder().url(origin + "/api" + path).header("Accept", "application/json").header("x-wb", "1")
        if (auth) prefs.token?.let { b.header("Authorization", "Bearer $it") }
        val reqBody = when {
            body != null -> body.toString().toRequestBody(JSON)
            method != "GET" -> "{}".toRequestBody(JSON)
            else -> null
        }
        http.newCall(b.method(method, reqBody).build()).execute().use { res ->
            val text = res.body?.string() ?: ""
            val status = res.code
            if (status == 401 && auth) throw Unauthorized()
            if (status >= 400) {
                val raw = try { JSONObject(text).optString("error", "") } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { "" }
                // Plain words for the two cases nobody can act on from the message itself.
                val msg = when {
                    status >= 500 -> "The app's server hit a problem${if (raw.isNotBlank()) " ($raw)" else ""}. Try again in a moment; if it keeps happening, report it from Settings."
                    status == 404 && raw.isBlank() -> "That isn't here any more. Go back to Leads and try again."
                    else -> raw.ifBlank { "Something went wrong ($status)" }
                }
                lastError = LastError(System.currentTimeMillis(), method, path, status, msg)
                throw ApiException(msg, status)
            }
            Response(text, res.headers("Set-Cookie"))
        }
    }

    class Response(val text: String, val cookies: List<String>) {
        fun json(): JSONObject = if (text.isBlank()) JSONObject() else JSONObject(text)
    }

    private suspend fun get(path: String) = call("GET", path).json()
    private suspend fun post(path: String, body: JSONObject? = null) = call("POST", path, body).json()
    private suspend fun put(path: String, body: JSONObject) = call("PUT", path, body).json()
    private suspend fun delete(path: String) = call("DELETE", path).json()

    suspend fun getJson(path: String): JSONObject = get(path)
    suspend fun postJson(path: String, body: JSONObject? = null): JSONObject = post(path, body)
    suspend fun putJson(path: String, body: JSONObject): JSONObject = put(path, body)
    suspend fun deleteJson(path: String): JSONObject = delete(path)

    /** Raw bytes with the session (preview images, PDFs). Follows redirects like a browser would. */
    suspend fun bytes(path: String): ByteArray = withContext(Dispatchers.IO) {
        val b = Request.Builder().url(if (path.startsWith("http")) path else origin + path)
        prefs.token?.let { b.header("Authorization", "Bearer $it") }
        http.newBuilder().followRedirects(true).build().newCall(b.build()).execute().use { res ->
            if (res.code == 401) throw Unauthorized()
            if (res.code >= 400) throw ApiException("Server error ${res.code}", res.code)
            res.body?.bytes() ?: ByteArray(0)
        }
    }

    /** Uploads a photo (JPEG bytes) to a lead: `kind` is "photo" (main photo) or "gallery". */
    suspend fun uploadPhoto(leadId: String, kind: String, jpeg: ByteArray, w: Int, h: Int, alt: String): JSONObject = withContext(Dispatchers.IO) {
        val b = Request.Builder()
            .url("$origin/api/leads/$leadId/$kind?w=$w&h=$h&alt=${URLEncoder.encode(alt, "UTF-8")}")
            .header("x-wb", "1")
            .post(jpeg.toRequestBody("image/jpeg".toMediaType()))
        prefs.token?.let { b.header("Authorization", "Bearer $it") }
        http.newBuilder().readTimeout(120, TimeUnit.SECONDS).writeTimeout(120, TimeUnit.SECONDS).build().newCall(b.build()).execute().use { res ->
            val status = res.code
            val text = res.body?.string() ?: ""
            if (status == 401) throw Unauthorized()
            if (status >= 400) throw ApiException(runCatching { JSONObject(text).optString("error") }.getOrNull()?.ifBlank { null } ?: "Upload failed ($status)", status)
            if (text.isBlank()) JSONObject() else JSONObject(text)
        }
    }

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

    suspend fun leads(sales: String? = null, callbacks: String? = null, category: String? = null, opened: String? = null, activity: Boolean = false): List<Lead> =
        get("/leads" + q("sales" to sales, "callbacks" to callbacks, "category" to category, "opened" to opened, "activity" to (if (activity) "1" else null))).optJSONArray("leads").objects().map { Lead.from(it) }

    suspend fun lead(id: String): LeadDetail = LeadDetail.from(get("/leads/$id"))

    suspend fun logCall(id: String, outcome: String, note: String, followUp: String?): JSONObject {
        val b = JSONObject().put("outcome", outcome).put("note", note)
        if (followUp != null) b.put("followUp", followUp)
        return post("/leads/$id/log", b)
    }

    suspend fun setStatus(id: String, salesStatus: String) = post("/leads/$id/status", JSONObject().put("salesStatus", salesStatus))

    suspend fun shareLink(id: String, lang: String? = null): String = post("/leads/$id/share", lang?.let { JSONObject().put("lang", it) }).optString("url")

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

    suspend fun addTask(title: String, notes: String, due: String?, dueTime: String?, assignees: List<String>, leadId: String?): Task {
        val b = JSONObject().put("title", title).put("notes", notes)
        if (due != null) b.put("due", due)
        if (dueTime != null) b.put("dueTime", dueTime)
        if (assignees.isNotEmpty()) b.put("assignees", org.json.JSONArray(assignees))
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

/** System DNS with IPv4 addresses ahead of IPv6, so a broken IPv6 route never delays the first connection. */
private object Ipv4First : Dns {
    override fun lookup(hostname: String) = Dns.SYSTEM.lookup(hostname).sortedBy { it is Inet6Address }
}
