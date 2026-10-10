package com.knightdx91.websitebusiness.tap

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Color
import android.location.LocationManager
import android.nfc.NfcAdapter
import android.os.Bundle
import android.provider.Settings
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import com.knightdx91.websitebusiness.BuildConfig
import com.knightdx91.websitebusiness.R
import com.stripe.stripeterminal.Terminal
import com.stripe.stripeterminal.external.callable.Callback
import com.stripe.stripeterminal.external.callable.Cancelable
import com.stripe.stripeterminal.external.callable.ConnectionTokenCallback
import com.stripe.stripeterminal.external.callable.ConnectionTokenProvider
import com.stripe.stripeterminal.external.callable.DiscoveryListener
import com.stripe.stripeterminal.external.callable.PaymentIntentCallback
import com.stripe.stripeterminal.external.callable.ReaderCallback
import com.stripe.stripeterminal.external.callable.TapToPayReaderListener
import com.stripe.stripeterminal.external.callable.TerminalListener
import com.stripe.stripeterminal.external.models.AllowRedisplay
import com.stripe.stripeterminal.external.models.CollectPaymentIntentConfiguration
import com.stripe.stripeterminal.external.models.ConfirmPaymentIntentConfiguration
import com.stripe.stripeterminal.external.models.ConnectionConfiguration
import com.stripe.stripeterminal.external.models.ConnectionStatus
import com.stripe.stripeterminal.external.models.ConnectionTokenException
import com.stripe.stripeterminal.external.models.DeviceType
import com.stripe.stripeterminal.external.models.DisconnectReason
import com.stripe.stripeterminal.external.models.DiscoveryConfiguration
import com.stripe.stripeterminal.external.models.LocaleConfig
import com.stripe.stripeterminal.external.models.PaymentIntent
import com.stripe.stripeterminal.external.models.PaymentIntentStatus
import com.stripe.stripeterminal.external.models.Reader
import com.stripe.stripeterminal.external.models.TapToPayUxConfiguration
import com.stripe.stripeterminal.external.models.TapUseCase
import com.stripe.stripeterminal.external.models.TerminalErrorCode
import com.stripe.stripeterminal.external.models.TerminalException
import com.stripe.stripeterminal.log.LogLevel
import org.json.JSONObject
import kotlin.concurrent.thread

/**
 * Takes one in-person card payment with Stripe Tap to Pay. Opened by the web app with
 * `intent://tap?t=<token>&o=<origin>#Intent;scheme=wbpay;…;end` once a client has signed; the Worker already created
 * the PaymentIntent. Steps: permissions and phone checks → ask the Worker what to charge → start Stripe Terminal →
 * find and connect the phone's own reader → Stripe's full-screen tap UI → tell the Worker, which saves the card for
 * renewals and marks the sign-up paid → back to the web page underneath, which shows "Paid".
 */
class TapToPayActivity : Activity() {

    companion object {
        const val EXTRA_TOKEN = "t"
        const val EXTRA_ORIGIN = "o"

        /** Opened straight from the app's lead screen (no deep link needed). */
        fun intent(context: Context, token: String, origin: String): Intent =
            Intent(context, TapToPayActivity::class.java).putExtra(EXTRA_TOKEN, token).putExtra(EXTRA_ORIGIN, origin)
    }

    private lateinit var business: TextView
    private lateinit var plan: TextView
    private lateinit var amount: TextView
    private lateinit var status: TextView
    private lateinit var detail: TextView
    private lateinit var spinner: ProgressBar
    private lateinit var retry: Button
    private lateinit var fix: Button
    private lateinit var close: Button

    private var api: TapApi? = null
    private var session: JSONObject? = null
    private var discovery: Cancelable? = null
    private var processing: Cancelable? = null
    private var paymentIntent: PaymentIntent? = null
    private var finished = false
    private var fixAction: (() -> Unit)? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_tap)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        business = findViewById(R.id.business)
        plan = findViewById(R.id.plan)
        amount = findViewById(R.id.amount)
        status = findViewById(R.id.status)
        detail = findViewById(R.id.detail)
        spinner = findViewById(R.id.spinner)
        retry = findViewById(R.id.retry)
        fix = findViewById(R.id.fix)
        close = findViewById(R.id.close)
        close.setOnClickListener { finish() }
        retry.setOnClickListener { retry.visibility = View.GONE; startFlow() }
        fix.setOnClickListener { fixAction?.invoke() }

        val data = intent?.data
        val token = intent?.getStringExtra(EXTRA_TOKEN) ?: data?.getQueryParameter("t")
        val origin = (intent?.getStringExtra(EXTRA_ORIGIN) ?: data?.getQueryParameter("o"))?.takeIf { it.startsWith("https://") } ?: BuildConfig.BASE_URL
        if (token.isNullOrBlank()) {
            fail(getString(R.string.tapOpenFromApp), null)
            return
        }
        api = TapApi(origin, token)
        startFlow()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        recreate()
    }

    // ---- 1. phone checks and permission ----

    private fun startFlow() {
        if (finished) return
        val nfc = NfcAdapter.getDefaultAdapter(this)
        if (nfc == null) return fail(getString(R.string.tapNoNfc), null)
        if (!nfc.isEnabled) return fail(getString(R.string.tapNfcOff), getString(R.string.tapTurnOnNfc)) {
            startActivity(Intent(Settings.ACTION_NFC_SETTINGS))
        }
        val lm = getSystemService(LOCATION_SERVICE) as LocationManager
        if (!lm.isLocationEnabled) return fail(getString(R.string.tapLocationOff), getString(R.string.tapTurnOnLocation)) {
            startActivity(Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS))
        }
        if (Settings.Global.getInt(contentResolver, Settings.Global.DEVELOPMENT_SETTINGS_ENABLED, 0) == 1 && !debuggable()) {
            return fail(getString(R.string.tapDevOptions), getString(R.string.tapOpenDevOptions)) {
                startActivity(Intent(Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS))
            }
        }
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            busy(getString(R.string.tapNeedLocation))
            requestPermissions(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION), 1)
            return
        }
        loadSession()
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != 1) return
        if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) loadSession()
        else fail(getString(R.string.tapLocationDenied), getString(R.string.tapOpenAppSettings)) {
            startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, android.net.Uri.parse("package:$packageName")))
        }
    }

    // ---- 2. what to charge ----

    private fun loadSession() {
        busy(getString(R.string.tapLoading))
        val a = api ?: return
        thread {
            try {
                val s = a.session()
                runOnUiThread {
                    session = s
                    business.text = s.optString("business")
                    plan.text = s.optString("plan")
                    amount.text = money(s.optLong("amountCents"))
                    if (s.optBoolean("paid")) {
                        done(getString(R.string.tapAlreadyPaid), null)
                    } else {
                        initTerminal()
                    }
                }
            } catch (e: Exception) {
                runOnUiThread { fail(e.message ?: getString(R.string.tapServerError), null, retryable = true) }
            }
        }
    }

    // ---- 3. Stripe Terminal ----

    private fun initTerminal() {
        val a = api ?: return
        try {
            if (!Terminal.isInitialized()) {
                Terminal.init(
                    applicationContext,
                    if (debuggable()) LogLevel.VERBOSE else LogLevel.ERROR,
                    object : ConnectionTokenProvider {
                        override fun fetchConnectionToken(callback: ConnectionTokenCallback) {
                            thread {
                                try {
                                    callback.onSuccess(a.connectionToken())
                                } catch (e: Exception) {
                                    callback.onFailure(ConnectionTokenException(e.message ?: "Couldn't get a connection token", e))
                                }
                            }
                        }
                    },
                    object : TerminalListener {
                        override fun onConnectionStatusChange(status: ConnectionStatus) {}
                    },
                    null,
                    LocaleConfig.CardLanguagePreferenceIfAvailable,
                )
            }
            Terminal.getInstance().setTapToPayUxConfiguration(
                TapToPayUxConfiguration.Builder()
                    .colorScheme(
                        TapToPayUxConfiguration.ColorScheme.Builder()
                            .primary(TapToPayUxConfiguration.Color.Value(Color.parseColor("#14213d")))
                            .build(),
                    )
                    .theme(TapToPayUxConfiguration.Theme.SYSTEM)
                    .build(),
            )
        } catch (e: TerminalException) {
            return fail(explain(e), null, retryable = true)
        }
        val connected = Terminal.getInstance().connectedReader
        if (connected != null) {
            retrieveAndProcess()
        } else {
            discover()
        }
    }

    private fun discover() {
        busy(getString(R.string.tapStartingReader))
        val config = DiscoveryConfiguration.TapToPayDiscoveryConfiguration(isSimulated = debuggable())
        val support = Terminal.getInstance().supportsReadersOfType(DeviceType.TAP_TO_PAY_DEVICE, config)
        if (!support.isSupported) {
            return fail(support.error?.let { explain(it) } ?: getString(R.string.tapUnsupported), null)
        }
        discovery = Terminal.getInstance().discoverReaders(
            config,
            object : DiscoveryListener {
                override fun onUpdateDiscoveredReaders(readers: List<Reader>) {
                    readers.firstOrNull()?.let { reader ->
                        runOnUiThread { connect(reader) }
                    }
                }
            },
            object : Callback {
                override fun onSuccess() {}
                override fun onFailure(e: TerminalException) {
                    runOnUiThread { fail(explain(e), null, retryable = true) }
                }
            },
        )
    }

    private fun connect(reader: Reader) {
        if (Terminal.getInstance().connectedReader != null) return
        busy(getString(R.string.tapConnecting))
        val locationId = session?.optString("locationId").orEmpty()
        val listener = object : TapToPayReaderListener {
            override fun onDisconnect(reason: DisconnectReason) {
                runOnUiThread { if (!finished && processing == null) fail(getString(R.string.tapDisconnected), null, retryable = true) }
            }

            override fun onReaderReconnectStarted(reader: Reader, cancelReconnect: Cancelable, reason: DisconnectReason) {
                runOnUiThread { status.text = getString(R.string.tapReconnecting) }
            }

            override fun onReaderReconnectSucceeded(reader: Reader) {
                runOnUiThread { status.text = getString(R.string.tapReady) }
            }

            override fun onReaderReconnectFailed(reader: Reader) {
                runOnUiThread { fail(getString(R.string.tapDisconnected), null, retryable = true) }
            }
        }
        Terminal.getInstance().connectReader(
            reader,
            ConnectionConfiguration.TapToPayConnectionConfiguration(TapUseCase.Pay(locationId), true, listener),
            object : ReaderCallback {
                override fun onSuccess(reader: Reader) {
                    runOnUiThread { retrieveAndProcess() }
                }

                override fun onFailure(e: TerminalException) {
                    runOnUiThread { fail(explain(e), null, retryable = true) }
                }
            },
        )
    }

    // ---- 4. the tap ----

    private fun retrieveAndProcess() {
        val secret = session?.optString("clientSecret").orEmpty()
        if (secret.isBlank()) return fail(getString(R.string.tapServerError), null, retryable = true)
        busy(getString(R.string.tapGettingReady))
        Terminal.getInstance().retrievePaymentIntent(
            secret,
            object : PaymentIntentCallback {
                override fun onSuccess(paymentIntent: PaymentIntent) {
                    runOnUiThread { process(paymentIntent) }
                }

                override fun onFailure(e: TerminalException) {
                    runOnUiThread { fail(explain(e), null, retryable = true) }
                }
            },
        )
    }

    private fun process(pi: PaymentIntent) {
        paymentIntent = pi
        if (pi.status == PaymentIntentStatus.SUCCEEDED) return report(pi)
        busy(getString(R.string.tapNow))
        detail.text = getString(R.string.tapHoldCard)
        val collect = CollectPaymentIntentConfiguration.Builder()
            .skipTipping(true)
            .setAllowRedisplay(AllowRedisplay.ALWAYS)
            .build()
        val confirm = ConfirmPaymentIntentConfiguration.Builder().build()
        processing = Terminal.getInstance().processPaymentIntent(
            pi,
            collect,
            confirm,
            object : PaymentIntentCallback {
                override fun onSuccess(paymentIntent: PaymentIntent) {
                    processing = null
                    runOnUiThread { report(paymentIntent) }
                }

                override fun onFailure(e: TerminalException) {
                    processing = null
                    // The same PaymentIntent is retried after a decline or a timeout; a new one would authorize twice.
                    e.paymentIntent?.let { paymentIntent = it }
                    runOnUiThread {
                        val canceled = e.errorCode == TerminalErrorCode.CANCELED || e.errorCode == TerminalErrorCode.CANCELED_BY_READER
                        fail(if (canceled) getString(R.string.tapCanceled) else explain(e), null, retryable = true)
                    }
                }
            },
        )
    }

    // ---- 5. tell the server ----

    private fun report(pi: PaymentIntent) {
        busy(getString(R.string.tapSaving))
        detail.text = ""
        val a = api ?: return
        val piId = pi.id ?: return fail(getString(R.string.tapServerError), null, retryable = true)
        thread {
            try {
                val r = a.complete(piId)
                runOnUiThread {
                    val card = r.optString("card").takeIf { it.isNotBlank() }
                    val renews = r.optString("renewsOn").takeIf { it.isNotBlank() }
                    val saved = r.optBoolean("cardSaved", true)
                    val lines = mutableListOf<String>()
                    if (card != null) lines.add(card)
                    if (renews != null) lines.add(getString(R.string.tapRenews, renews))
                    if (!saved) lines.add(getString(R.string.tapCardNotSaved))
                    done(getString(R.string.tapPaid, money(r.optLong("amountCents", pi.amount))), lines.joinToString("\n"))
                }
            } catch (e: Exception) {
                runOnUiThread {
                    // The card was charged; the Worker's webhook and daily check finish the bookkeeping even if this fails.
                    done(getString(R.string.tapPaid, money(pi.amount)), getString(R.string.tapReportFailed, e.message ?: ""))
                }
            }
        }
    }

    // ---- UI states ----

    private fun busy(text: String) {
        status.text = text
        detail.text = ""
        spinner.visibility = View.VISIBLE
        retry.visibility = View.GONE
        fix.visibility = View.GONE
        close.text = getString(R.string.tapCancel)
    }

    private fun fail(text: String, fixLabel: String?, retryable: Boolean = false, action: (() -> Unit)? = null) {
        status.text = text
        spinner.visibility = View.GONE
        retry.visibility = if (retryable || action != null) View.VISIBLE else View.GONE
        fixAction = action
        fix.visibility = if (fixLabel != null && action != null) View.VISIBLE else View.GONE
        if (fixLabel != null) fix.text = fixLabel
        close.text = getString(R.string.tapCancel)
    }

    private fun done(text: String, extra: String?) {
        finished = true
        status.text = text
        detail.text = extra ?: ""
        spinner.visibility = View.GONE
        retry.visibility = View.GONE
        fix.visibility = View.GONE
        close.text = getString(R.string.tapDone)
        // Back to the web page (it is polling and shows "Paid"); long enough to read the result first.
        close.postDelayed({ if (!isFinishing) finish() }, 6000)
    }

    override fun onDestroy() {
        discovery?.cancel(object : Callback { override fun onSuccess() {}; override fun onFailure(e: TerminalException) {} })
        processing?.cancel(object : Callback { override fun onSuccess() {}; override fun onFailure(e: TerminalException) {} })
        if (Terminal.isInitialized() && Terminal.getInstance().connectedReader != null) {
            Terminal.getInstance().disconnectReader(object : Callback { override fun onSuccess() {}; override fun onFailure(e: TerminalException) {} })
        }
        super.onDestroy()
    }

    // ---- helpers ----

    private fun debuggable() = applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0

    private fun money(cents: Long): String = if (cents % 100 == 0L) "$" + (cents / 100) else String.format("$%.2f", cents / 100.0)

    /** Stripe's error codes in the owner's words (research/android-tap-to-pay-2026.md §3.5). */
    private fun explain(e: TerminalException): String {
        val decline = e.apiError?.declineCode?.takeIf { it.isNotBlank() }
        return when (e.errorCode) {
            TerminalErrorCode.TAP_TO_PAY_NFC_DISABLED -> getString(R.string.tapNfcOff)
            TerminalErrorCode.LOCATION_SERVICES_DISABLED -> getString(R.string.tapLocationOff)
            TerminalErrorCode.TAP_TO_PAY_UNSUPPORTED_DEVICE, TerminalErrorCode.TAP_TO_PAY_UNSUPPORTED_PROCESSOR,
            TerminalErrorCode.TAP_TO_PAY_UNSUPPORTED_ANDROID_VERSION -> getString(R.string.tapUnsupported)
            TerminalErrorCode.TAP_TO_PAY_DEVICE_TAMPERED -> getString(R.string.tapTampered)
            TerminalErrorCode.TAP_TO_PAY_INSECURE_ENVIRONMENT -> getString(R.string.tapInsecure)
            TerminalErrorCode.TAP_TO_PAY_DEBUG_NOT_SUPPORTED -> getString(R.string.tapDebugBuild)
            TerminalErrorCode.DECLINED_BY_STRIPE_API, TerminalErrorCode.DECLINED_BY_READER ->
                getString(R.string.tapDeclined) + (decline?.let { " ($it)" } ?: "")
            TerminalErrorCode.CARD_READ_TIMED_OUT -> getString(R.string.tapTimedOut)
            TerminalErrorCode.SESSION_EXPIRED -> getString(R.string.tapSessionExpired)
            TerminalErrorCode.STRIPE_API_CONNECTION_ERROR -> getString(R.string.tapOffline)
            else -> (e.errorMessage?.takeIf { it.isNotBlank() } ?: e.errorCode.toString())
        }
    }
}
