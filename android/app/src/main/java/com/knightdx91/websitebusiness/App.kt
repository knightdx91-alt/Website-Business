package com.knightdx91.websitebusiness

import android.app.Application
import com.stripe.stripeterminal.TerminalApplicationDelegate
import com.stripe.stripeterminal.taptopay.TapToPay

/**
 * Stripe's Tap to Pay runs in its own secure process (":stripetaptopay"), which instantiates this Application a second
 * time. Nothing of ours may run there, so the delegate is only wired up in the main process.
 */
class App : Application() {
    override fun onCreate() {
        super.onCreate()
        if (TapToPay.isInTapToPayProcess()) return
        TerminalApplicationDelegate.onCreate(this)
    }
}
