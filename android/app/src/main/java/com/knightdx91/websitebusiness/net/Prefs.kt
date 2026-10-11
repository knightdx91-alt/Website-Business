package com.knightdx91.websitebusiness.net

import android.content.Context
import android.content.SharedPreferences

/** The signed-in session and small per-phone state, in the app's private storage (sandboxed per app by Android). */
class Prefs(context: Context) {
    private val p: SharedPreferences = context.applicationContext.getSharedPreferences("wb", Context.MODE_PRIVATE)

    var token: String?
        get() = p.getString("token", null)
        set(v) = p.edit().putString("token", v).apply()
    var name: String
        get() = p.getString("name", "") ?: ""
        set(v) = p.edit().putString("name", v).apply()
    var role: String
        get() = p.getString("role", "caller") ?: "caller"
        set(v) = p.edit().putString("role", v).apply()
    var userId: String
        get() = p.getString("userId", "") ?: ""
        set(v) = p.edit().putString("userId", v).apply()
    var email: String
        get() = p.getString("email", "") ?: ""
        set(v) = p.edit().putString("email", v).apply()
    /** Newest team event already shown as a phone notification. */
    var lastAlertAt: Long
        get() = p.getLong("lastAlertAt", 0L)
        set(v) = p.edit().putLong("lastAlertAt", v).apply()
    var lastUpdateCheck: Long
        get() = p.getLong("lastUpdateCheck", 0L)
        set(v) = p.edit().putLong("lastUpdateCheck", v).apply()
    /** "Later" on the update pop-up: this versionCode stays quiet until updateSnoozedAt + 1 day. */
    var updateSnoozedCode: Int
        get() = p.getInt("updateSnoozedCode", 0)
        set(v) = p.edit().putInt("updateSnoozedCode", v).apply()
    var updateSnoozedAt: Long
        get() = p.getLong("updateSnoozedAt", 0L)
        set(v) = p.edit().putLong("updateSnoozedAt", v).apply()
    /** The versionCode the background worker already posted an "Update available" notification for. */
    var updateNotifiedCode: Int
        get() = p.getInt("updateNotifiedCode", 0)
        set(v) = p.edit().putInt("updateNotifiedCode", v).apply()

    val isOwner: Boolean get() = role == "owner"
    val loggedIn: Boolean get() = !token.isNullOrBlank()

    fun signIn(token: String, name: String, role: String, userId: String, email: String) {
        p.edit().putString("token", token).putString("name", name).putString("role", role).putString("userId", userId).putString("email", email).apply()
    }

    fun signOut() {
        p.edit().remove("token").remove("name").remove("role").remove("userId").remove("email").apply()
    }
}
