package com.knightdx91.websitebusiness.push

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.knightdx91.websitebusiness.alerts.Alerts
import com.knightdx91.websitebusiness.net.Api
import com.knightdx91.websitebusiness.update.Updater
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/** Receives the Worker's pushes, app open or not: posts the update notification or the new team alerts right away. */
class PushService : FirebaseMessagingService() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onMessageReceived(message: RemoteMessage) {
        val kind = message.data["kind"] ?: return
        val api = Api(applicationContext)
        if (!api.prefs.loggedIn) return
        scope.launch {
            runCatching {
                when (kind) {
                    "update" -> Updater.notifyIfNewer(applicationContext, api)
                    "alerts" -> Alerts.deliver(applicationContext, api)
                }
            }
            Push.events.tryEmit(kind)
        }
    }

    /** Topics follow the token automatically; nothing to register with the Worker. */
    override fun onNewToken(token: String) {
        if (Api(applicationContext).prefs.loggedIn) Push.configure(applicationContext, currentConfig())
    }

    private fun currentConfig() = Api(applicationContext).prefs.let { p ->
        if (p.fcmAppId.isBlank()) null else com.knightdx91.websitebusiness.net.FcmConfig(p.fcmAppId, p.fcmApiKey, p.fcmProjectId, p.fcmSenderId)
    }
}
