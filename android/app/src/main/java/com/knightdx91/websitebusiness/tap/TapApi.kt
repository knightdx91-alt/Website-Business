package com.knightdx91.websitebusiness.tap

import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

/**
 * The three Worker calls the Tap to Pay screen makes, authenticated with the short-lived token the web page put in the
 * intent:// link (Chrome's login cookie isn't visible to this screen). Call from a background thread.
 */
class TapApi(private val origin: String, private val token: String) {

    class ApiException(message: String, val status: Int) : IOException(message)

    fun session(): JSONObject = call("GET", "/api/tap/session", null)

    fun connectionToken(): String = call("POST", "/api/tap/connection_token", JSONObject()).getString("secret")

    fun complete(paymentIntentId: String): JSONObject =
        call("POST", "/api/tap/complete", JSONObject().put("paymentIntentId", paymentIntentId))

    private fun call(method: String, path: String, body: JSONObject?): JSONObject {
        val conn = URL(origin + path).openConnection() as HttpURLConnection
        try {
            conn.requestMethod = method
            conn.connectTimeout = 15_000
            conn.readTimeout = 30_000
            conn.setRequestProperty("Authorization", "Bearer $token")
            conn.setRequestProperty("Accept", "application/json")
            // The Worker's CSRF guard wants this on every non-GET call.
            conn.setRequestProperty("x-wb", "1")
            if (body != null) {
                conn.doOutput = true
                conn.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                conn.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
            }
            val status = conn.responseCode
            val stream = if (status < 400) conn.inputStream else conn.errorStream
            val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: ""
            val json = try { JSONObject(text) } catch (e: Exception) { JSONObject() }
            if (status >= 400) throw ApiException(json.optString("error", "Server error $status"), status)
            return json
        } finally {
            conn.disconnect()
        }
    }
}
