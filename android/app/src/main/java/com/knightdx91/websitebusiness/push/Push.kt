package com.knightdx91.websitebusiness.push

import android.content.Context
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.messaging.FirebaseMessaging
import com.knightdx91.websitebusiness.net.Api
import com.knightdx91.websitebusiness.net.FcmConfig
import kotlinx.coroutines.flow.MutableSharedFlow

/**
 * Instant pushes (Firebase Cloud Messaging). The Worker sends data-only messages to the "team" topic: {kind: "update"}
 * the minute a new build is uploaded, {kind: "alerts"} on every team event. Firebase is initialised here from the four
 * public values in Settings → Phone alerts (Firebase) (`/meta.fcm.client`), so the app ships no google-services.json;
 * until they are set the app keeps its 15-minute polling. [PushService] receives; [events] lets the open app react.
 */
object Push {
    const val TOPIC = "team"

    /** "update" or "alerts", for whoever is on screen (AppRoot). */
    val events = MutableSharedFlow<String>(extraBufferCapacity = 8)

    /** Initialise Firebase from the stored values. True when Firebase is usable in this process. */
    fun init(context: Context): Boolean {
        val p = Api(context).prefs
        if (p.fcmAppId.isBlank() || p.fcmApiKey.isBlank() || p.fcmProjectId.isBlank() || p.fcmSenderId.isBlank()) return false
        return runCatching {
            if (FirebaseApp.getApps(context).isEmpty()) {
                FirebaseApp.initializeApp(context, FirebaseOptions.Builder().setApplicationId(p.fcmAppId).setApiKey(p.fcmApiKey).setProjectId(p.fcmProjectId).setGcmSenderId(p.fcmSenderId).build())
            }
            true
        }.getOrDefault(false)
    }

    /** After sign-in (and whenever /meta is refreshed): store the values, initialise, subscribe to the team topic. */
    fun configure(context: Context, cfg: FcmConfig?) {
        val p = Api(context).prefs
        if (cfg == null) {
            if (p.fcmAppId.isNotBlank()) unsubscribe(context)
            p.fcmAppId = ""; p.fcmApiKey = ""; p.fcmProjectId = ""; p.fcmSenderId = ""
            return
        }
        p.fcmAppId = cfg.appId; p.fcmApiKey = cfg.apiKey; p.fcmProjectId = cfg.projectId; p.fcmSenderId = cfg.senderId
        if (init(context)) runCatching { FirebaseMessaging.getInstance().subscribeToTopic(TOPIC) }
    }

    fun unsubscribe(context: Context) {
        if (init(context)) runCatching { FirebaseMessaging.getInstance().unsubscribeFromTopic(TOPIC) }
    }
}
