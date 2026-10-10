package com.knightdx91.websitebusiness

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import com.knightdx91.websitebusiness.alerts.AlertWorker
import com.stripe.stripeterminal.TerminalApplicationDelegate
import com.stripe.stripeterminal.taptopay.TapToPay

class App : Application() {
    override fun onCreate() {
        super.onCreate()
        // Stripe's Tap to Pay runs in its own secure process (":stripetaptopay"), which instantiates this Application a
        // second time. Nothing of ours may run there.
        if (TapToPay.isInTapToPayProcess()) return
        TerminalApplicationDelegate.onCreate(this)
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel(AlertWorker.CHANNEL, getString(R.string.alertsChannel), NotificationManager.IMPORTANCE_DEFAULT).apply {
            description = getString(R.string.alertsChannelAbout)
        })
        AlertWorker.schedule(this)
    }
}
