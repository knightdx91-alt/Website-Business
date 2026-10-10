# Android Tap to Pay with Stripe for the Website Business app (research, October 2026)

Research only; nothing here is built. Written for the developer who implements it next. Sources are Stripe's
docs (docs.stripe.com, support.stripe.com, the SDK changelog on GitHub, Maven Central) and Google's docs, read
on 10 October 2026. Anything marked **UNCONFIRMED** could not be verified in writing and must be tested or asked.

What the owner wants: a client taps their card or phone on the owner's Samsung Galaxy Z Fold 8, that first
payment goes through, and the same card is used for the monthly or yearly subscription afterwards. Today the app is
a PWA wrapped in a Trusted Web Activity (`android/`, androidbrowserhelper) and payments run through Stripe Checkout
(`src/worker/checkout.ts`) with a live webhook (`src/worker/stripe.ts`).

## 0. Short version

- **It is doable with the current Stripe account and the current phone.** Tap to Pay on Android is generally
  available in the US, works for ordinary (non-Connect) accounts, needs no entitlement or approval step (unlike
  iPhone), and the Z Fold8 is on Stripe's supported-phone list. No Dashboard "request access" step was found
  (details in §1.1; flagged UNCONFIRMED only because we could not log in to look).
- **Cost:** US in-person pricing is 2.7% + 5¢ plus **$0.10 per Tap to Pay authorization**; the later subscription
  charges on the saved card are ordinary online charges at 2.9% + 30¢ (card-present pricing and the EMV liability
  shift do not carry over to the saved card).
- **The payment flow Stripe documents for exactly this case** (their own example is a gym selling a session plus a
  membership): a `card_present` PaymentIntent with `setup_future_usage=off_session` and a `customer`; the charge
  returns a reusable `generated_card` PaymentMethod attached to the Customer; create the Subscription with
  `default_payment_method=<generated_card>`, `billing_cycle_anchor` at the end of the period just paid and
  `proration_behavior=none`, so nothing is billed twice.
- **The TWA cannot host the Terminal SDK** (the page runs in Chrome, not in our process). Recommendation (§3): keep
  the TWA for everything it already does well and add **one native Kotlin `TapToPayActivity` in the same APK**,
  opened from the web page by an `intent://` link that carries a one-time server token. Fall back to a WebView shell
  with a JavaScript bridge only if that hand-off proves unreliable in a half-day spike. A full native rewrite is not
  worth it.
- **Build:** Stripe Terminal Android SDK **6.0.0** (released 7 Oct 2026), artifacts
  `com.stripe:stripeterminal-taptopay:6.0.0` + `com.stripe:stripeterminal-core:6.0.0`, `compileSdk` ≥ 35, Kotlin
  2.3.21. The SDK is big: the two AARs are 22.6 MB + 26.6 MB on Maven Central, with native libraries for
  `arm64-v8a` and `armeabi-v7a` only, so the APK grows from ~1 MB to roughly 25–30 MB (arm64 only) or ~40 MB (both
  ABIs). No NDK is needed. Everything builds headless on the Linux box with the SDK command-line tools.
- **Distribution:** Stripe never states that the app must be installed from Google Play; it requires Google Mobile
  Services and the Play Store *app* on the device, a non-rooted device with a locked bootloader, a security patch from
  the last 12 months, Developer options **off**, and a **non-debuggable** build. Strong indirect evidence says a
  sideloaded release APK works (§1.6), but this is **UNCONFIRMED** and is the first thing to test. If it fails, the
  Play **internal testing** track (up to 100 testers, live in minutes, no review, not subject to the 12-tester rule)
  is enough; a Play developer account is a one-time US$25.
- **Effort:** about two developer weeks spread over three to four calendar weeks (waiting on a physical test card
  and possibly Play account verification). Plan in §6.

## 1. Stripe Tap to Pay on Android: the 2026 requirements

### 1.1 Availability and account requirements

- US is in the generally-available list for Tap to Pay on Android (with 20 other countries; 18 more in public
  preview). Source: https://docs.stripe.com/terminal/payments/setup-reader/tap-to-pay?platform=android and
  https://docs.stripe.com/terminal/tap-to-pay-readers.
- Direct (non-Connect) accounts: Terminal docs treat a plain Stripe account as the normal case ("A Terminal setup
  usually includes: a Stripe account, a physical location where you accept payments ... a supported reader or Tap to
  Pay device"). Connect is an add-on, not a requirement. Source: https://docs.stripe.com/terminal/overview.
- The account receiving funds and the Terminal Location must be in the same country, charging local currency only
  (US account, US location, USD). Source: https://docs.stripe.com/terminal/payments/regional?integration-country=US.
- **No enablement / approval step found.** iPhone needs an Apple entitlement; the Android page lists only: integrate
  the SDK, swap dependencies, add a permission, connect, collect. Stripe's support article on Tap to Pay says nothing
  about requesting access either (https://support.stripe.com/questions/tap-to-pay-on-iphone-or-android-and-stripe-terminal).
  The no-code "Tap to Pay with Stripe Dashboard" app lists only "Stripe account, Dashboard app, location permissions,
  supported device" as requirements (https://docs.stripe.com/no-code/in-person). **UNCONFIRMED by logging in:** the
  owner should open Dashboard → Terminal once; if a "Get started with Terminal" prompt appears, click through it.
  Quick sanity test that costs nothing: install the Stripe Dashboard Android app on the Fold 8 and take a $1 test-mode
  Tap to Pay payment; that proves the device, the account and the country in five minutes before any code is written.
- Subscribe the owner (or dev) to terminal-announce@lists.stripe.com: Stripe says "device and minimum SDK version
  requirements can change due to updated compliance requirements or security vulnerabilities".

### 1.2 Device requirements (enforced by the SDK at discover/connect time)

Verbatim from https://docs.stripe.com/terminal/payments/setup-reader/tap-to-pay?platform=android#supported-devices.
A device must:

- not be a certified (PCI PTS) payment device;
- have a functioning, integrated NFC sensor and an ARM-based processor;
- not be rooted; bootloader locked and unchanged;
- run **Android 13 or later**;
- have a **security update installed from the past 12 months** (error `terminal_unsupported_android_patch` when it
  lapses; https://support.stripe.com/questions/tap-to-pay-on-android-security-patch-requirements);
- use Google Mobile Services and **have the Google Play Store app installed**;
- have a keystore with hardware support for ECDH (`FEATURE_HARDWARE_KEYSTORE` version ≥ 100);
- have a stable internet connection;
- run the unmodified manufacturer OS;
- have **Developer options disabled**.

Emulators are not supported; "the same device requirements are enforced in the simulated and production reader".
The **Samsung Galaxy Z Fold8** (and Fold8 Ultra, Fold4–7, Z TriFold) is on Stripe's supported-phones table. Where
the NFC tap zone is on the Fold 8 and whether the SDK positions the indicator correctly on the inner screen is
**UNCONFIRMED**; the SDK auto-positions the indicator "when possible" and falls back to a default; test both the
cover screen and the inner screen on day one and pick the one that reads reliably.

Owner-facing consequences: Developer options must be OFF on the Fold 8 (many Android power users have them on; the
production reader refuses to start with `TAP_TO_PAY_INSECURE_ENVIRONMENT`), NFC must be on, the phone must keep
taking monthly security patches, and no accessibility services / screen recording / overlays may be active during
PIN entry (see §1.8).

### 1.3 The SDK in October 2026

- **Current version: 6.0.0, released 7 Oct 2026** (5.8.2 on 2 Oct 2026; 5.6.0 is marked deprecated for an offline
  database migration bug). Source: https://github.com/stripe/stripe-terminal-android/releases.
- Support policy (https://docs.stripe.com/terminal/references/sdk-versioning): 6.x GA Oct 2026, critical fixes only
  from Oct 2027, deprecated Oct 2028, end of life Oct 2029. 5.x enters critical-fixes-only in Oct 2026. Versions
  1.x–3.x are **blocked from connecting in January 2027**. "Tap to Pay functionality might have additional
  constraints that require upgrades to your SDK in advance of the timeline." Start on 6.0.0.
- Gradle coordinates for a Tap to Pay app (replace plain `stripeterminal`):
  ```kotlin
  dependencies {
    implementation("com.stripe:stripeterminal-taptopay:6.0.0")
    implementation("com.stripe:stripeterminal-core:6.0.0")
    implementation("com.stripe:stripeterminal-ktx:6.0.0") // optional: suspend wrappers
  }
  ```
  All Terminal artifacts must be the same version. Sources:
  https://docs.stripe.com/terminal/payments/setup-reader/tap-to-pay?platform=android#get-started,
  https://docs.stripe.com/terminal/references/sdk-migration-guide?terminal-sdk-platform=android.
- Build requirements: `compileSdk = 35` or higher (6.0 raised it from 34); SDK built with **Kotlin 2.3.21** ("align the
  Kotlin toolchain in your app if dependency resolution reports a conflict"); Java 8 target is enough; AndroidX
  required (SDK uses Room). Source: https://docs.stripe.com/terminal/payments/setup-integration?terminal-sdk-platform=android.
- `minSdk`: the SDK README says API 26+; the 6.0.0 AAR manifests we inspected declare `minSdkVersion 26`. Tap to
  Pay itself only runs on Android 13+ (API 33), enforced at runtime, so `minSdk = 26` compiles and the runtime check
  does the rest. Our current app already uses `minSdk = 26`.
- ProGuard/R8: the SDK ships consumer rules, "narrower in 6.0"; only add keep rules if you reflect into SDK classes.
  Test a minified release build before shipping, or keep `isMinifyEnabled = false` as today (the APK is large anyway).
- Permissions. Required by the integration page: `ACCESS_FINE_LOCATION` (runtime prompt; the SDK does not function
  without it and "if the SDK can't determine the location of the Android device, payments are disabled"). Required
  for Tap to Pay since 6.0: `MODIFY_AUDIO_SETTINGS` (normal permission, no prompt; the SDK declares it too, but verify
  it is in the merged manifest). Bluetooth permissions are listed only "to connect a mobile reader", so a Tap-to-Pay-
  only app does not need them. Merged in automatically from the `stripeterminal-taptopay` AAR manifest (inspected):
  `NFC`, `INTERNET`, `ACCESS_NETWORK_STATE`, `READ_PHONE_STATE`, `HIDE_OVERLAY_WINDOWS` (API 31+),
  `MODIFY_AUDIO_SETTINGS`; and from `stripeterminal-internal-common`: `ACCESS_COARSE_LOCATION`, `ACCESS_WIFI_STATE`.
  Expect Play's data-safety form to ask about location and phone state if you publish.
- Separate process. Tap to Pay "operates in a dedicated process to make transactions more secure"; the AAR declares
  its activities, `TtpService` and a content provider in `android:process=":stripetaptopay"`. Your `Application`
  class is instantiated a second time in that process; guard it:
  ```kotlin
  class App : Application() {
      override fun onCreate() {
          super.onCreate()
          if (TapToPay.isInTapToPayProcess()) return   // nothing of ours runs in the secure process
          TerminalApplicationDelegate.onCreate(this)
      }
  }
  ```
  Anything else declared in that process (a .NET runtime provider in GitHub issue #601, for example) makes the real
  reader fail with "not operating in secure process" (`TAP_TO_PAY_INSECURE_ENVIRONMENT`). Our TWA shell has no such
  components. Source: https://docs.stripe.com/terminal/payments/connect-reader?reader-type=tap-to-pay&terminal-sdk-platform=android,
  https://github.com/stripe/stripe-terminal-android/issues/601.
- Native code: the `stripeterminal-taptopay-6.0.0.aar` contains `jni/arm64-v8a` and `jni/armeabi-v7a` (no x86):
  `libcots-android-native.so` (5.2 MB), `libd70c.so`, `libsscommon.so`, `libjcbkernel.so`, `libagnos.so` and two
  obfuscated libs, plus ~3 MB of Inter font files and a 4 MB asset. `stripeterminal-internal-common-6.0.0.aar` (26.6
  MB) has no native libraries. No NDK is required to build; the `.so` files are prebuilt. (Inspected by downloading
  the AARs from Google's Maven Central mirror on 10 Oct 2026.)
- POM dependencies worth knowing (they come in transitively): AndroidX appcompat/fragment/lifecycle/recyclerview/
  constraintlayout/gridlayout, Material 1.13, Dagger 2.59, **Google Play Integrity 1.1.0**, OkHttp 4.12, Jackson
  2.18.8, kotlinx-serialization 1.11, Wire/Moshi, `rootbeer-lib` (root detection), `stripeterminal-external` and
  `stripeterminal-internal-common` 6.0.0.

### 1.4 Naming changes you will meet in old samples

| When | Change |
|---|---|
| 4.0.0 (31 Oct 2024) | "Local Mobile" renamed "Tap To Pay" everywhere: `stripeterminal-localmobile` → `stripeterminal-taptopay`; `LocalMobileDiscoveryConfiguration` → `TapToPayDiscoveryConfiguration`; error codes `LOCAL_MOBILE_*` → `TAP_TO_PAY_*`. SafetyNet Attestation replaced by Play Integrity. |
| 5.0.0 (Oct 2025) | Tap to Pay needs Android 13+ and a hardware-backed key-agreement keystore; `Terminal.initTerminal` → `Terminal.init(..., offlineListener)`; `processPaymentIntent` / `processSetupIntent` / `processRefund` one-step calls; `easyConnect`; `TapZone` refactor; Discover on Tap to Pay (public preview); `handoffclient` → `stripeterminal-appsondevices`. Process renamed `<applicationId>:stripetaptopay`. |
| 5.2.0 | 12-month security-patch rule enforced. |
| 6.0.0 (7 Oct 2026) | `compileSdk` 35; `MODIFY_AUDIO_SETTINGS`; `TapToPayConnectionConfiguration(useCase = TapUseCase.Pay(locationId), ...)` replaces the constructor that took a bare location id; `TapToPayUxConfiguration.DarkMode` → `Theme` (default `SYSTEM`), `colors` → `colorScheme`, no longer `Parcelable`; `Terminal.init` requires a `LocaleConfig`; `PaymentIntentParameters` default capture is now `AutomaticAsync` (was `Manual`); `CANCELED_BY_READER` error; `SESSION_EXPIRED` for attestation failures on expired tokens; `PaymentIntent.getCharges()` removed (use `latestCharge`); `onUpdateRequirementsAvailable` advisory callback. |

Sources: https://github.com/stripe/stripe-terminal-android/blob/master/CHANGELOG.md,
https://docs.stripe.com/terminal/references/sdk-v5-migration-guide?terminal-sdk-platform=android,
https://docs.stripe.com/terminal/references/sdk-migration-guide?terminal-sdk-platform=android.

### 1.5 UI, branding and "education screen"

- Stripe's SDK **takes over the screen** for the tap: "After you call the process payment method, your application
  continues to run while Tap to Pay displays a full-screen prompt that instructs the cardholder to tap their card or
  NFC-based mobile wallet. If there's an error reading the card, a prompt for retry displays. A successful tap returns a
  success indication and then control returns to your application." You cannot replace this screen; you can theme it
  (`TapToPayUxConfiguration`: tap-zone position, primary/success/error colors, light/dark/system) by calling
  `Terminal.getInstance().setTapToPayUxConfiguration(config)`. The PIN screen is not themeable and the PIN pad
  appears at a random position by design.
- **Android has no mandatory education overlay** (Apple requires one on iPhone via `ProximityReaderDiscovery`). For
  Android Stripe lists "best practices and promotion guidelines": connect to the reader in the background at app
  start, use automatic reconnection, "provide merchant education to guide your users on how to accept contactless
  payments", and get marketing templates/design assets through the Stripe Partner portal. For a one-user app a
  one-time "How to take a tap payment" card in the app is enough. Showing the contactless symbol and card-brand marks
  is not mandated by Stripe's Android docs we found (other processors require it); the Stripe tap screen already
  shows the contactless symbol. **UNCONFIRMED**: whether the partner-portal assets carry any mandatory wording.
  Source: https://docs.stripe.com/terminal/payments/setup-reader/tap-to-pay?platform=android#best-practices.

### 1.6 Sideloaded APK vs Google Play (the question that decides the distribution plan)

What Stripe says in writing:

- Device must "use Google Mobile Services and have the Google Play Store app installed"; nothing about where *your
  app* came from. The production reader refuses **debuggable** apps and devices with Developer options on, not
  non-Play installs (https://docs.stripe.com/terminal/payments/connect-reader?reader-type=tap-to-pay&terminal-sdk-platform=android#discover-readers).
- The February 2023 Android Developers blog post about Stripe's SDK says the PCI MPoC standard "requires Stripe to
  verify that Android applications using the Tap to Pay on Android SDK are unmodified, and that those applications
  have been installed from a trusted source **like** the Google Play Store", and that Stripe's SDK calls Play
  Integrity "with an API key" so developers "won't have to separately integrate with the Integrity API"
  (https://android-developers.googleblog.com/2023/02/how-stripe-leveraged-google-play-to-build-an-sdk-for-tap-to-pay-on-android.html).
- GitHub issue #669 ("Tap 2 Pay requires Google Play installed and not disabled", Jan 2026): Stripe replied that
  Google Play Services are required "so the device can be verified as safe", closed as not planned. The topic was the
  Play *app being hidden by an MDM*, not install source (https://github.com/stripe/stripe-terminal-android/issues/669).
- Stripe's MPoC security-guidance page (`/terminal/references/ttpa-security-guidance`) returned 404 for us on 10 Oct
  2026, so we could not read the merchant obligations it may list. **UNCONFIRMED.**

How Play Integrity works (Google): the **device** verdict (`MEETS_DEVICE_INTEGRITY`, `MEETS_STRONG_INTEGRITY` =
device integrity plus security updates in the last year, which matches Stripe's 12-month rule) does not depend on how
the app was installed; only the **licensing** verdict distinguishes "installed from Play" (`LICENSED`) from a sideload
(`UNLICENSED`), and `appRecognitionVerdict` compares package + certificate with Play's records
(https://developer.android.com/google/play/integrity/verdicts). Because Stripe's SDK calls Play Integrity under
Stripe's own Cloud project/API key, it can only reasonably use the device verdict plus the signing-certificate digest
it reads itself; a licensing check for *our* package would need *our* Play Console project.

Circumstantial evidence that sideloading works: Stripe's supported-device table is full of enterprise hardware
(Sunmi, Zebra, Honeywell, Ciontek, iMin) that is normally provisioned by MDM/APK, not Play; the Android SDK's only
documented app-side gates are "not debuggable" and "Developer options off"; Stripe exposes a `terminal_android_apk`
file purpose in its Files API for Apps-on-Devices APKs.

**Verdict:** very likely a release-signed, non-debuggable, sideloaded APK works, exactly as `android/build.sh`
produces today. **UNCONFIRMED in writing.** Make it the first test (§6, step 0): build the smallest possible app with
the SDK, release-sign it, install via the existing R2 download path, run `discoverReaders(isSimulated=false)` +
`connectReader` in test mode. If attestation fails with the app installed outside Play, publish to the Play
**internal testing** track (§4.3), which satisfies any "installed from Play" check without a public listing.

### 1.7 Fees

From https://stripe.com/pricing (US, read 10 Oct 2026):

| | Rate |
|---|---|
| Terminal in-person, domestic card | 2.7% + 5¢ per successful transaction |
| **Tap to Pay (iPhone or Android)** | **+ $0.10 per authorization** on top of the in-person rate |
| International card in person | + 1.5% |
| Online card (today's Checkout, and every later subscription charge on the saved card) | 2.9% + 30¢ |

So a $89 Plus first month taken in person costs $2.40 + $0.05 + $0.10 = $2.55 instead of $2.88 online; the renewals
cost the same as today. Stripe states explicitly that for the saved card "features available to card-present
transactions (such as liability shifts and pricing) don't apply to these subsequent charges"
(https://docs.stripe.com/terminal/features/saving-payment-details/save-after-payment). Tap to Pay cannot use P2PE,
offline mode or on-reader tipping (support article above).

### 1.8 Cards, PIN, limits

- Tap to Pay on Android takes Visa, Mastercard, American Express and Discover contactless cards and NFC wallets
  (Apple Pay, Google Pay, Samsung Pay). PIN entry is supported (SDK ≥ 4.3.0) and only works when Developer options
  are off, no accessibility services are running, no screen recording, no overlay windows, internet is up; a
  screenshot attempt fails PIN collection; failures surface as `TAP_TO_PAY_INSECURE_ENVIRONMENT`.
- Stripe's contactless-limit table has no US row (https://support.stripe.com/questions/what-are-the-regional-contactless-limits-for-stripe-terminal-transactions);
  US contactless payments normally have no CVM limit and PIN prompts are issuer-driven and rare. Expect a yearly Pro
  payment ($1,490) to go through on a tap, but a PIN or a decline on a high amount is possible; have the sign-up link
  (card typed online) as the fallback. **UNCONFIRMED** for amounts above $1,000 on US cards: test with the physical
  test card and amounts ending in `.03` (forces PIN) and `.00`.
- Mobile wallets cannot be used in test mode at all ("you can't use Stripe Terminal with mobile wallets in
  testmode"). Saved wallet cards come back with `allow_redisplay=limited` and may only be charged off-session, which
  is what a subscription does.

## 2. Server side (Cloudflare Worker, raw REST)

Everything below uses the existing `stripeForm()` encoder from `src/worker/checkout.ts` and the Worker secret
`STRIPE_SECRET_KEY`. Add an `Idempotency-Key` header to every POST that creates money objects, keyed on the sign-up
id, so a retried request after a dropped connection cannot create a second PaymentIntent or Subscription.

```ts
// src/worker/tap.ts (sketch)
import { stripeForm } from "./checkout";

async function stripe<T>(env: Env, path: string, params: Record<string, unknown>, idempotencyKey?: string): Promise<T> {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "content-type": "application/x-www-form-urlencoded",
      ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}),
    },
    body: stripeForm(params),
  });
  const data = (await res.json()) as T & { error?: { message?: string; code?: string } };
  if (!res.ok) throw new Error(`Stripe: ${data.error?.message ?? res.status}`);
  return data;
}

async function stripeGet<T>(env: Env, path: string, query: Record<string, unknown> = {}): Promise<T> {
  const qs = stripeForm(query).toString();
  const res = await fetch(`https://api.stripe.com/v1/${path}${qs ? `?${qs}` : ""}`, {
    headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
  });
  const data = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(`Stripe: ${data.error?.message ?? res.status}`);
  return data;
}
```

API version: the Worker sends no `Stripe-Version`, so the account default applies. Stripe's save-after-payment flow
needed `2024-09-30.acacia` or later when `allow_redisplay` became mandatory (31 Mar 2025). Check the account's
default version in Dashboard → Developers; if it is older, pin `Stripe-Version` on these calls (and only these,
to avoid changing webhook payload shapes).

### 2.1 Terminal Location (one time)

Tap to Pay readers are not registered ahead of time; "you associate your reader with a location at connection
time". Create one Location for the company (US address required: `line1`, `city`, `state`, `postal_code`,
`country`), store its id in `settings` (`terminalLocationId`), and expose a Settings button "Set up Tap to Pay" that
creates it if missing.

```ts
const loc = await stripe<{ id: string }>(env, "terminal/locations", {
  display_name: "Underground Associates (on the go)",
  address: { line1: "<company street>", city: "Cullman", state: "AL", postal_code: "35055", country: "US" },
});
// loc.id = "tml_..."
```

Source: https://docs.stripe.com/terminal/fleet/locations-and-zones?dashboard-or-api=api.

### 2.2 Connection token endpoint

`POST /api/terminal/connection_token` (owner-only, `x-wb: 1`, or the one-time tap token from §3.2). The SDK calls
it whenever it needs to authenticate; never cache the secret. The `location` parameter only scopes smart readers and
is ignored for Tap to Pay, so omit it.

```ts
const tok = await stripe<{ secret: string }>(env, "terminal/connection_tokens", {});
return json({ secret: tok.secret });
```

Stripe's warning: "The secret from the ConnectionToken lets you connect to any Stripe Terminal reader and take
payments with your Stripe account. Be sure to authenticate the endpoint." Source:
https://docs.stripe.com/terminal/payments/setup-integration?terminal-sdk-platform=android#connection-token.

### 2.3 Start an in-person order: Customer + PaymentIntent

Precondition: the client has already signed the agreement on the owner's phone (the existing `/a/<lead>…` sign-up
flow stores `signups` with the terms, name and signature). The agreement already carries a PAYMENT AUTHORIZATION
section (`paymentAuthText(s)` in `src/worker/contract.ts`: charge the card on file through Stripe for the plan and
approved extras, notice of different amounts, how to revoke) plus renewal and cancellation terms, which is exactly the
written consent Stripe requires before saving a card for off-session use ("the customer's agreement to your initiating
a payment or a series of payments ... the anticipated timing and frequency ... how the payment amount is determined
... your cancellation policy ... keep a record of your customer's written agreement"). Add one sentence to
`paymentAuthText` and to the Tap screen: "A card tapped on our phone counts as the card on file: Stripe keeps it and
charges it for this plan on each renewal."

What to charge today = what `priceSignup()` would put on Stripe Checkout's first invoice: every one-time line (month-
to-month setup fee, one-time/per-item extras) plus the first period of every recurring line (the plan month or the
yearly amount, monthly extras ×1 or ×12 on yearly). Reuse `priceSignup()`; split its lines into `today` and
`recurring`.

```ts
// 1) Customer (reuse signups.stripe_customer if the lead already has one)
const customer = await stripe<{ id: string }>(env, "customers", {
  name: lead.name, email: signup.signer_email ?? undefined, phone: lead.phone,
  metadata: { lead_id: lead.id, signup_id: signup.id },
}, `cus:${signup.id}`);

// 2) PaymentIntent for the card_present charge
const pi = await stripe<{ id: string; client_secret: string }>(env, "payment_intents", {
  amount: todayCents,                       // integer cents
  currency: "usd",
  customer: customer.id,
  payment_method_types: ["card_present"],
  setup_future_usage: "off_session",        // ask Stripe for a reusable generated_card
  capture_method: "automatic",              // or leave the default automatic_async; manual needs capture within 2 days
  receipt_email: signup.signer_email ?? undefined, // Stripe emails a network-compliant receipt on capture
  description: `${plan.name} website plan, first ${billing.interval}`,
  statement_descriptor_suffix: "WEBSITE",
  metadata: { kind: "signup_tap", signupId: signup.id, leadId: lead.id },
}, `pi:${signup.id}`);
// store pi.id on the signup (new column stripe_payment_intent); return { clientSecret: pi.client_secret, amount: todayCents }
```

Notes: `payment_method_types` must include `card_present`; `customer` + `setup_future_usage` makes Stripe create and
attach a `generated_card` to the Customer automatically ("If the payment method is card_present and isn't a digital
wallet, then a generated_card payment method representing the card is created and attached to the Customer"). Do
not create a new PaymentIntent after a decline; the app retries the same one (§3.4). If `capture_method=manual`,
the authorization expires in **2 days**. Sources:
https://docs.stripe.com/terminal/features/saving-payment-details/save-after-payment?terminal-sdk-platform=android,
https://docs.stripe.com/api/payment_intents/create, https://docs.stripe.com/terminal/payments/collect-card-payment?terminal-sdk-platform=android.

### 2.4 After the tap: read the generated card and start the subscription

The app confirms on the device (always client-side: "Server-side confirmation bypasses critical interactions, such
as PIN prompts") and then calls `POST /api/signups/:id/tap/complete {paymentIntentId}`. The Worker must not trust the
app's word; it re-reads the PaymentIntent.

```ts
const pi = await stripeGet<{
  id: string; status: string; amount: number; amount_received: number; customer: string;
  latest_charge: { id: string; payment_method_details: { card_present?: { generated_card?: string | null; brand?: string; last4?: string; wallet?: { type?: string } } } };
}>(env, `payment_intents/${paymentIntentId}`, { "expand[]": "latest_charge" });

if (pi.metadata?.signupId !== signup.id || !["succeeded", "requires_capture", "processing"].includes(pi.status)) throw ...;
const generated = pi.latest_charge?.payment_method_details?.card_present?.generated_card ?? null;
```

`generated_card` can be **null** ("some payments, such as digital wallet payments and single-branded Interac,
eftpos, or girocard card payments, might not create a generated card"). Then: keep the in-person payment, mark the
sign-up paid for the first period, and either run the SetupIntent flow on the device for a second tap (§2.6) or send
the normal sign-up link so the client types a card online; the app should say which happened.

Create the subscription so that the period already paid in person is not billed again. Two documented ways
(https://docs.stripe.com/billing/subscriptions/billing-cycle#configure-proration-behavior):

- **Recommended: `billing_cycle_anchor` (or `billing_cycle_anchor_config`) + `proration_behavior=none`.** "Disable
  the proration by setting proration_behavior to none, making the initial period up to the first full invoice date
  free. This action doesn't generate an invoice at all until the first billing period." The subscription is `active`
  at once, no $0 "free trial" invoice, no trial emails, no card-network trial-disclosure rules.
- Alternative: `trial_end=<period end>`; creates a $0 invoice with "Free trial" wording and `trialing` status; works,
  but reads oddly on the client's Stripe emails for something they just paid for.

```ts
const sub = await stripe<{ id: string; status: string }>(env, "subscriptions", {
  customer: pi.customer,
  default_payment_method: generated,        // the generated_card, already attached to the customer
  items: [
    { price_data: { currency: "usd", unit_amount: plan.monthly /* or yearly amount */, product_data: { name: plan.name }, recurring: { interval: billing.interval } } },
    ...monthlyExtras.map((x) => ({ price_data: { currency: "usd", unit_amount: x.amount, product_data: { name: x.name }, recurring: { interval: billing.interval } }, quantity: x.qty })),
  ],
  // next occurrence of today's day-of-month (monthly) or month+day (yearly), at the creation time of day: exactly one period ahead,
  // short months handled by Stripe. billing_cycle_anchor (unix seconds) also works if you prefer to compute it.
  billing_cycle_anchor_config: billing.interval === "year" ? { month: nowUtc.getUTCMonth() + 1, day_of_month: nowUtc.getUTCDate() } : { day_of_month: nowUtc.getUTCDate() },
  proration_behavior: "none",               // no invoice until the anchor
  off_session: true,                        // renewals are merchant-initiated
  collection_method: "charge_automatically",
  metadata: { kind: "signup", signupId: signup.id, leadId: lead.id, paid_in_person: pi.id },
}, `sub:${signup.id}`);

// make the card the customer's default for anything else (extras bought later, portal)
await stripe(env, `customers/${pi.customer}`, { invoice_settings: { default_payment_method: generated } });

// same bookkeeping the Checkout webhook does today (extract it from handleStripeEvent into one function)
await env.DB.prepare("UPDATE signups SET paid = 1, stripe_customer = ?, stripe_subscription = ? WHERE id = ?").bind(pi.customer, sub.id, signup.id).run();
await planPaid(env, lead.id); await notify(env, { kind: "paid", actorName: "Tap to Pay", leadId: lead.id, text: `💵 ${lead.name} paid ${money(pi.amount)} by tap; renews ${billing.interval}ly` });
```

Parameter references: `default_payment_method` ("must belong to the customer associated with the subscription"),
`billing_cycle_anchor` ("a future timestamp in UTC"), `billing_cycle_anchor_config` ("the billing_cycle_anchor is set
to the next occurrence of the day_of_month at the hour, minute, and second UTC", monthly/yearly prices only),
`proration_behavior` (`none` = "disable creating prorations in this request"), `off_session`, `payment_behavior`:
https://docs.stripe.com/api/subscriptions/create. The "first invoice is finalized as part of the request" rule does
not bite here because with `proration_behavior=none` and a future anchor there is no first invoice.

Edge cases to code for:
- Month-to-month (`flexSetup`): today's PaymentIntent = $299 setup + first month; subscription monthly from next
  month. 6/12-month minimums are contract terms (as today), not Stripe terms.
- Yearly (12 for the price of 10): today's PaymentIntent = 10 × monthly; subscription price = the same yearly amount,
  anchor one year ahead. Churches (`churchAnnualMonthsFree`) are the same shape with 8 months.
- Existing webhook handlers keep working because `signups.stripe_customer` / `stripe_subscription` are filled:
  `customer.subscription.deleted` un-marks the plan, `invoice.payment_failed` notifies. Add `payment_intent.succeeded`
  with `metadata.kind = "signup_tap"` as a belt-and-braces path in case the app died between the tap and the
  `/complete` call: the webhook can run the same completion routine (idempotent; keyed by the Idempotency-Key and by
  checking `signups.stripe_subscription IS NULL`).
- Timeouts: if the app never reports back, a daily reconciliation (cron) lists PaymentIntents with
  `metadata.kind=signup_tap` that have no subscription and finishes or refunds them. Stripe's checklist asks for
  exactly this reconciliation step (https://docs.stripe.com/terminal/references/checklist).

### 2.5 Refunds, cancellations and disputes

- Not yet captured (manual capture only): `POST /v1/payment_intents/{id}/cancel`. Captured: `POST /v1/refunds` with
  `payment_intent=pi_…` and optional `amount` (cents). "Online refunds don't require a cardholder to present their
  card again at the point of sale" and work for every network except Interac (Canada). Refund failures arrive
  asynchronously (`refund.failed` webhook). Source: https://docs.stripe.com/terminal/features/refunds?terminal-sdk-platform=android.
- Backing out the whole sale: refund the PaymentIntent and `DELETE /v1/subscriptions/{id}`; the existing
  `customer.subscription.deleted` handler un-marks the sign-up. Partial refunds follow the policy already in `/terms`.
- Disputes: "All Terminal readers are chip-capable. This means the bank is generally liable for fraudulent-type
  disputes instead of you. Certain network exceptions may apply." Only *fraud* categories shift; "credit not
  processed", "product not received" etc. stay with us, and the later subscription charges are card-not-present with
  no shift. Radar is not available for Terminal. Keep the signed agreement, the Stripe receipt and the site's go-live
  record as evidence. Sources: https://support.stripe.com/questions/how-disputes-work-for-terminal,
  https://docs.stripe.com/disputes/categories.

### 2.6 Alternative: save the card without charging (SetupIntent)

For a client who pays today by check (churches, `?invoice=1`) but should still be on card for renewals, or when a
PaymentIntent produced no `generated_card`: `POST /v1/setup_intents` with `customer`, `payment_method_types[]=
card_present`, `usage=off_session`; the app runs `processSetupIntent(setupIntent, CollectSetupIntentConfiguration.
Builder(AllowRedisplay.ALWAYS).build(), …)`; then `GET /v1/setup_intents/{id}?expand[]=latest_attempt` and read
`latest_attempt.payment_method_details.card_present.generated_card`. Same subscription call afterwards (with an
anchor at the invoice's paid-through date). Source: https://docs.stripe.com/terminal/features/saving-payment-details/save-directly?terminal-sdk-platform=android.

### 2.7 Receipts

Card-network rules for in-person payments: "you must provide customers with the option to receive a physical or email
receipt." Simplest compliant path: set `receipt_email` on the PaymentIntent (Stripe emails a receipt with all
network-required fields at capture; also saved in the Dashboard as dispute evidence); if the email is unknown at tap
time, update the PaymentIntent's `receipt_email` afterwards. Custom receipts must carry `application_preferred_name`,
`dedicated_file_name` (AID) and, outside the US, `account_type`, from
`charge.payment_method_details.card_present.receipt`. Subscription renewals are invoices; Stripe's Billing emails cover
them as today. Source: https://docs.stripe.com/terminal/features/receipts.

## 3. App architecture

### 3.1 The three options, honestly

**A. Keep the TWA, add a native `TapToPayActivity` in the same APK (recommended).**
The TWA page (running in Chrome) opens an `intent://` link; Android starts our exported activity on top of the Chrome
tab; the activity does the Stripe work and `finish()`es; the page is still there underneath and polls the sign-up
status.

- Keeps everything that works today because it is still Chrome: service worker, **Web Push + notification
  delegation** (the DelegationService in the manifest), cookies/logins, camera `<input type=file capture>`, PDF
  downloads, `tel:`/`sms:`, Chrome's autofill and password manager, updates with every `npm run deploy`.
- Smallest change: no WebView plumbing, no FCM, the web app only gains a button and a status poll.
- Costs: an auth hand-off (Chrome's cookie is not visible to the app, so the page asks the Worker for a 10-minute
  single-use token and puts it in the link); a round-trip UX (Chrome → native screen → Stripe's full-screen tap UI →
  native result → back to Chrome); APK grows to tens of MB; Chrome requires a **user gesture** to launch an external
  intent (a button tap, not a timer) and needs the `intent://` form with a package name and
  `S.browser_fallback_url` (https://developer.chrome.com/docs/android/intents).
- Risk to retire in a spike: that Chrome in TWA mode hands a custom-scheme `intent://` to our own package reliably.
  Custom Tabs normally do; one unanswered Stack Overflow report describes it falling through to the Play-Store fallback
  with a mis-declared filter. Our activity must declare `android:exported="true"` with
  `<action VIEW>`, `<category DEFAULT>`, `<category BROWSABLE>`, `<data android:scheme="wbpay"/>`. Half a day.

**B. WebView shell with a JavaScript bridge (`window.Android.tapToPay(signupId)`).**
- Pros: one process, so the app can read the login cookie (`CookieManager.getInstance().getCookie(origin)`) and call
  the Worker directly; results can be pushed back with `webView.evaluateJavascript("window.onTapResult(...)")`; no
  deep-link gymnastics; full control over the app UI.
- Cons, each a real work item: **no Web Push** (Android WebView does not implement the Push API; the current VAPID
  pushes stop working in the app, so you build FCM: Firebase project, `google-services.json`, FCM HTTP v1 calls from
  the Worker with a service-account JWT, token registration, and keep Web Push for the browser), file chooser
  (`WebChromeClient.onShowFileChooser` + `FileProvider` + `CAMERA` permission for photo uploads), downloads
  (`DownloadListener` → `DownloadManager` with the `Cookie` header for the signed PDFs), geolocation prompt
  (`onGeolocationPermissionsShowPrompt`), `tel:`/`sms:`/`mailto:` and external links via `shouldOverrideUrlLoading`,
  back-button navigation, `window.open`, `WebSettings` (JS, DOM storage, mixed content off), and Google's warning that
  `addJavascriptInterface` "lets JavaScript control your Android app ... don't let the user navigate within your
  WebView to web pages that aren't your own" (https://developer.android.com/develop/ui/views/layout/webapps/webview).
  Also loses Chrome's autofill and the `assetlinks` verification you already maintain. Two to four extra days and a
  permanent second notification path.

**C. Full native rewrite.** Dozens of screens (leads, edit, call guide, tasks, inbox, settings...) that change weekly
with `npm run deploy`. Not justified for one native feature.

**Recommendation: A**, with B as the documented fallback if the spike fails. Either way the Stripe-specific Kotlin
(§3.3) is identical, so nothing is wasted if you switch.

### 3.2 How A fits together

```
 Chrome (TWA)                              Worker                                   TapToPayActivity (our APK)
 lead screen → "Take payment by tap"       POST /api/signups/:id/tap/start           started by intent://tap?...
   → page asks Worker for a tap session ──▶  creates Customer + PaymentIntent,          reads token, signupId
   → location.href = intent://…#Intent;…      returns {token, clientSecret, amount}      GET  /api/tap/session (token) → clientSecret, amount, name
                                             POST /api/terminal/connection_token ◀───── ConnectionTokenProvider (token)
                                                                                       discover → connect(TapUseCase.Pay(tml_…)) → retrievePaymentIntent
                                                                                       processPaymentIntent (Stripe's tap screen) → PI succeeded
   page polls GET /api/signups/:id ◀──────── POST /api/signups/:id/tap/complete ◀────── reports pi.id; shows "Paid $89"; finish()
   shows "Paid, renews monthly"              reads generated_card, creates Subscription,
                                             marks paid, notifies
```

- The tap token: `HMAC(APP_SECRET, signupId.exp)` like the existing share links, single-use (store a nonce in D1 or
  KV), 10 minutes, only issued to an owner/admin session. The activity sends it as `Authorization: Bearer`. The
  `/api/terminal/connection_token`, `/api/tap/session` and `/api/signups/:id/tap/complete` routes accept this token
  or the owner cookie.
- The `intent://` link from the page (user gesture required):
  `intent://tap?s=<signupId>&t=<token>#Intent;scheme=wbpay;package=com.knightdx91.websitebusiness;S.browser_fallback_url=https%3A%2F%2Fwebsite-business.knightdx91.workers.dev%2F%23%2Finstall-app;end`
- Return path: `finish()` drops back to the Chrome tab; the page was polling (or re-fetches on `visibilitychange`).
  Optionally the activity relaunches the TWA on `#/lead/<id>` via the existing `LauncherActivity` intent.

### 3.3 Project structure (Kotlin, plain Activity, no Compose)

Keep `android/` (AGP 8.13.2 is already there and supports `compileSdk` up to 36.1, needs Gradle ≥ 8.13 and JDK 17;
the box has Gradle 8.14.3 and JDK 21). Add Kotlin: KGP **2.3.21** supports Gradle 7.6.3–9.3.0 and AGP 8.2.2–9.0.0,
so it pairs with AGP 8.13.2 (https://kotlinlang.org/docs/gradle-configure-project.html,
https://developer.android.com/build/releases/past-releases/agp-8-13-0-release-notes).

```
android/
  build.gradle.kts            plugins { id("com.android.application") version "8.13.2" apply false
                                        id("org.jetbrains.kotlin.android") version "2.3.21" apply false }
  app/build.gradle.kts        plugins: com.android.application, org.jetbrains.kotlin.android
                              compileSdk 36, minSdk 26, targetSdk 35/36, versionCode 5, versionName "2.0"
                              ndk { abiFilters += listOf("arm64-v8a") }   // sideloaded APK: Fold 8 is arm64; drop for AAB
                              compileOptions Java 17 (fine; SDK needs ≥ 1.8) ; kotlin { compilerOptions { jvmTarget = JVM_17 } }
                              dependencies: androidbrowserhelper 2.6.2 (keep), stripeterminal-taptopay 6.0.0,
                                            stripeterminal-core 6.0.0, stripeterminal-ktx 6.0.0, appcompat, activity-ktx,
                                            lifecycle-runtime-ktx, kotlinx-coroutines-android (no OkHttp needed: HttpURLConnection is enough for 3 calls)
  app/src/main/AndroidManifest.xml
      + android:name=".App" on <application>
      + <uses-permission ACCESS_FINE_LOCATION/>, <uses-permission MODIFY_AUDIO_SETTINGS/>
      + <activity android:name=".tap.TapToPayActivity" android:exported="true" android:launchMode="singleTop"
                  android:screenOrientation="portrait">
          <intent-filter><action VIEW/><category DEFAULT/><category BROWSABLE/><data android:scheme="wbpay" android:host="tap"/></intent-filter>
        </activity>
      (keep every androidbrowserhelper entry as is)
  app/src/main/java/com/knightdx91/websitebusiness/
      App.kt                  Application: isInTapToPayProcess() guard, TerminalApplicationDelegate.onCreate
      tap/TapApi.kt           tiny HTTPS client for the three Worker calls (token in Authorization header)
      tap/TokenProvider.kt    ConnectionTokenProvider → POST /api/terminal/connection_token
      tap/TapToPayActivity.kt the screen: amount + business name, status line, Cancel; owns the Terminal flow
      tap/TapViewModel.kt     (optional) keeps the Cancelable and state across rotation
  app/src/main/res/layout/activity_tap.xml, values/strings.xml, values/colors.xml (brand navy/orange for TapToPayUxConfiguration)
```

Lock the activity to portrait, keep the screen on (`FLAG_KEEP_SCREEN_ON`), and give it a plain opaque theme (the
shell's `Theme.Translucent.NoTitleBar` is for the launcher only).

### 3.4 Terminal integration, in order

Code shapes follow the 6.0.0 docs (connect page, collect page, migration guide cited in §1).

1. **Initialize once** (in the activity or a lazy singleton; must happen after location permission is granted):
   ```kotlin
   if (!Terminal.isInitialized()) {
       Terminal.init(
           context = applicationContext,
           logLevel = if (BuildConfig.DEBUG) LogLevel.VERBOSE else LogLevel.ERROR,
           tokenProvider = TokenProvider(api),
           listener = object : TerminalListener {
               override fun onConnectionStatusChange(status: ConnectionStatus) { /* show Connecting… / Ready */ }
               override fun onPaymentStatusChange(status: PaymentStatus) {}
           },
           offlineListener = null,
           localeConfig = LocaleConfig.CardLanguagePreferenceIfAvailable,
       )
   }
   Terminal.getInstance().setTapToPayUxConfiguration(
       TapToPayUxConfiguration.Builder()
           .colorScheme(TapToPayUxConfiguration.ColorScheme.Builder()
               .primary(TapToPayUxConfiguration.Color.Value(Color.parseColor("#14213d"))).build())
           .theme(TapToPayUxConfiguration.Theme.SYSTEM)
           .build()
   )
   ```
2. **Request `ACCESS_FINE_LOCATION`** at runtime (`ActivityResultContracts.RequestPermission`); if denied, show "Tap
   to Pay needs Location on; Stripe uses it to know where payments happen" and stop. Also check
   `LocationManager.isLocationEnabled` and `NfcAdapter.getDefaultAdapter(this)?.isEnabled` up front and deep-link
   to the right Settings panel (`Settings.ACTION_NFC_SETTINGS`, `Settings.ACTION_LOCATION_SOURCE_SETTINGS`).
3. **Optional pre-check:** `Terminal.getInstance().supportsReadersOfType(DeviceType.TAP_TO_PAY_DEVICE, …)`
   (~10 ms) to show a clear "this phone can't take tap payments" before trying.
4. **Discover** the on-device reader. The production reader refuses debuggable builds, so simulate in debug:
   ```kotlin
   val debuggable = applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0
   val cfg = DiscoveryConfiguration.TapToPayDiscoveryConfiguration(isSimulated = debuggable || session.testMode)
   discoverCancelable = Terminal.getInstance().discoverReaders(cfg, object : DiscoveryListener {
       override fun onUpdateDiscoveredReaders(readers: List<Reader>) { readers.firstOrNull()?.let(::connect) }
   }, object : Callback { override fun onSuccess() {} ; override fun onFailure(e: TerminalException) = fail(e) })
   ```
   Cancel `discoverCancelable` in `onStop` if nothing connected ("or the SDK will be stuck in a discover readers
   phase"). The app must be in the foreground.
5. **Connect** with the Location id from the Worker session payload:
   ```kotlin
   Terminal.getInstance().connectReader(reader, ConnectionConfiguration.TapToPayConnectionConfiguration(
       useCase = TapUseCase.Pay(session.locationId),
       autoReconnectOnUnexpectedDisconnect = true,
       tapToPayReaderListener = object : TapToPayReaderListener {
           override fun onDisconnect(reason: DisconnectReason) { status("Reader disconnected: $reason") }
           override fun onReaderReconnectStarted(reader: Reader, cancelReconnect: Cancelable, reason: DisconnectReason) { status("Reconnecting…") }
           override fun onReaderReconnectSucceeded(reader: Reader) { status("Ready") }
           override fun onReaderReconnectFailed(reader: Reader) { status("Lost the reader; try again") }
           override fun onUpdateRequirementsAvailable(requirements: List<TapToPayUpdateRequirement>) { /* advisory: show "update your phone before <date>" */ }
       },
   ), readerCallback)
   ```
   First connection on a device can take several seconds (attestation, key provisioning). Stripe recommends
   connecting in the background at app start; for a once-a-week sale, connecting when the activity opens is fine.
6. **Retrieve and process** the PaymentIntent the Worker created:
   ```kotlin
   Terminal.getInstance().retrievePaymentIntent(session.clientSecret, object : PaymentIntentCallback {
       override fun onSuccess(pi: PaymentIntent) {
           payCancelable = Terminal.getInstance().processPaymentIntent(
               paymentIntent = pi,
               collectConfig = CollectPaymentIntentConfiguration.Builder().setAllowRedisplay(AllowRedisplay.ALWAYS).build(),
               confirmConfig = ConfirmPaymentIntentConfiguration.Builder().build(),
               callback = object : PaymentIntentCallback {
                   override fun onSuccess(done: PaymentIntent) { api.complete(session.signupId, done.id); showPaid(done) }
                   override fun onFailure(e: TerminalException) = handlePaymentFailure(e)
               })
       }
       override fun onFailure(e: TerminalException) = fail(e)
   })
   ```
   `processPaymentIntent` = collect + confirm in one call (5.0+). Stripe's tap screen appears here; PIN, if needed,
   is collected inside it. The `allowRedisplay` value records the consent to save the card (`ALWAYS` lets Stripe
   show it in the Billing portal later; `LIMITED` is the stricter choice; both allow off-session charging).
7. **Notify the server** (`/tap/complete`), show the result ("Paid $89. Renews monthly from Nov 10."), offer
   "Email receipt" if no email was known (Worker updates `receipt_email`), then `finish()`.
8. **Disconnect** in `onDestroy` (`Terminal.getInstance().disconnectReader(...)`) or keep the connection in a
   process-wide holder if you expect several payments in a row.

### 3.5 Error cases the activity must handle

| Situation | How it shows | What to do |
|---|---|---|
| NFC off | `TerminalErrorCode.TAP_TO_PAY_NFC_DISABLED` | Button → `Settings.ACTION_NFC_SETTINGS`, retry |
| Location permission denied / location services off | SDK refuses to init / payments disabled | Explain, deep-link to settings |
| Phone not supported (no hardware keystore, x86, Android < 13) | `TAP_TO_PAY_UNSUPPORTED_DEVICE`, `TAP_TO_PAY_UNSUPPORTED_PROCESSOR`, `TAP_TO_PAY_UNSUPPORTED_ANDROID_VERSION` | Not fixable by the user; fall back to the sign-up link |
| Security patch older than 12 months | `terminal_unsupported_android_patch` on connect | "Install the pending Android update" |
| Rooted / unlocked bootloader / non-GMS | `TAP_TO_PAY_DEVICE_TAMPERED`, `ATTESTATION_FAILURE` | Not fixable; fall back |
| Developer options on, accessibility service, screen recorder, overlay, debuggable build | `TAP_TO_PAY_INSECURE_ENVIRONMENT`, `TAP_TO_PAY_DEBUG_NOT_SUPPORTED` | Tell the owner exactly what to switch off (Developer options is the common one) |
| Expired session token during attestation | `SESSION_EXPIRED` (6.0; was `STRIPE_API_CONNECTION_ERROR`) | Fetch a new connection token, connect again |
| No internet | `STRIPE_API_CONNECTION_ERROR` | Retry when online; Tap to Pay has no offline mode |
| Card declined | `onFailure` with PaymentIntent status `requires_payment_method` (`DECLINED_BY_STRIPE_API` / `DECLINED_BY_READER`, `decline_code` in `e.apiError`) | "Declined: try another card" and call `processPaymentIntent` again **with the same PaymentIntent** |
| Temporary connectivity problem after collect | status `requires_confirmation` | Call again with the same PaymentIntent |
| Timeout, unknown status (`PaymentIntent` null) | | Retry the same PaymentIntent; never create a new one (double authorization) |
| Owner cancels | `CANCELED` (`CANCELED_BY_READER` if cancelled on the tap screen) | Back to the page; the Worker's reconciliation cancels the stale PaymentIntent later |
| Card read timed out | `CARD_READ_TIMED_OUT` | Retry |
| High amount needs PIN and the environment is insecure | PIN step fails with `TAP_TO_PAY_INSECURE_ENVIRONMENT` | Fix the environment or use the sign-up link |
| Memory pressure kills the reader service | `onDisconnect` / auto reconnect callbacks | Status text; auto reconnect handles it |

Error code reference: https://stripe.dev/stripe-terminal-android/external/com.stripe.stripeterminal.external.models/-terminal-error-code/index.html.

### 3.6 Testing

- **Debug builds use the simulated Tap to Pay reader** (`isSimulated = true`); the real reader will not start in a
  debuggable app. The simulator "automatically simulates card presentment"; choose outcomes with
  `Terminal.getInstance().setSimulatorConfiguration(SimulatorConfiguration(simulatedCard = SimulatedCard(SimulatedCardType.VISA)))`
  (also `CHARGE_DECLINED`, `CHARGE_DECLINED_INSUFFICIENT_FUNDS`, `AMEX`, `MASTERCARD_DEBIT`, `REFUND_FAIL`,
  `ONLINE_PIN_CVM`, ...). The simulated reader still enforces the device rules (Android 13, NFC, keystore), so test on
  the Fold 8, not an emulator. Sources: https://docs.stripe.com/terminal/references/testing,
  https://docs.stripe.com/terminal/payments/connect-reader?reader-type=simulated&terminal-sdk-platform=android.
- **Real reader = release-signed build + test-mode keys.** The Worker currently has only the live key. Add a
  `STRIPE_TEST_SECRET_KEY` secret and a `testMode` flag on the tap session (only for the owner; shown as a red "TEST"
  banner) so the same APK can run sandbox payments; or deploy a second Worker (`wrangler deploy --env dev`) pointing
  at the sandbox. Mobile wallets do not work in test mode, so order Stripe's **physical test card** from Dashboard →
  Terminal → Shop (contactless capable; PIN `1234`; amounts ending `.00` approve, `.05` generic decline, `.01`
  call_issuer, `.03` PIN prompt, `.55` incorrect PIN). It only works with sandbox keys; in live mode the API rejects
  it. Shipping time is unknown; order it on day one.
- **End to end in sandbox:** sign agreement → tap → `generated_card` present → subscription created `active` with
  anchor one period ahead → use a **test clock** (https://docs.stripe.com/billing/testing/test-clocks) to advance one
  month and watch the renewal invoice charge the generated card → `invoice.payment_failed` with
  `SimulatedCardType.CHARGE_DECLINED_INSUFFICIENT_FUNDS` variants → refund → cancel subscription → webhook un-marks.
- **Live smoke test:** one $1 live tap with the owner's own card (Stripe says do not use test cards live), refund it
  from the Dashboard. There is already a `paytest` lead convention for this (CLAUDE.md).

## 4. Build and distribution on the Linux box (no Android Studio)

### 4.1 Toolchain facts

- Already present: JDK 21 (AGP 8.13 needs ≥ 17), Gradle 8.14.3 (AGP 8.13 needs ≥ 8.13; KGP 2.3.21 allows up to
  9.3.0), AGP 8.13.2 in `android/build.gradle.kts`. `ANDROID_HOME` is **not** set on this box; `android/build.sh`
  expects it with `platforms;android-36` and build tools.
- Android SDK command-line tools: `commandlinetools-linux-15859902_latest.zip` (181.8 MB) from
  https://developer.android.com/studio#command-line-tools-only. Google now marks `sdkmanager` "deprecated" in favor
  of the new `android sdk install|list|update|remove` CLI (preview), but `sdkmanager` still ships in the package and
  works (https://developer.android.com/tools/sdkmanager).
- Components needed: `platform-tools` (adb, for installing/logcat over USB or Wi-Fi debugging), `platforms;android-36`
  (compileSdk), `build-tools;36.0.0` (AGP 8.13 needs ≥ 35.0.0). **No NDK, no CMake** (prebuilt `.so`s). No emulator
  (unsupported by Tap to Pay anyway).

```bash
export ANDROID_HOME="$HOME/android-sdk"
mkdir -p "$ANDROID_HOME/cmdline-tools" && cd "$ANDROID_HOME/cmdline-tools"
curl -LO https://dl.google.com/android/repository/commandlinetools-linux-15859902_latest.zip
echo "4e4c464f145a7512b57d088ac6c278c03c9eea610886b35a5e0804e74eedf583  commandlinetools-linux-15859902_latest.zip" | sha256sum -c
unzip -q commandlinetools-linux-15859902_latest.zip && mv cmdline-tools latest
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
yes | sdkmanager --licenses >/dev/null
sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"
# then, as today:
KEYDIR=... android/build.sh      # gradle --no-daemon assembleRelease -PwbKeystore=… ; uploads to R2
```

Gradle downloads the Stripe AARs (~50 MB) from the Google Maven Central mirror already listed first in
`settings.gradle.kts` (Maven Central rate-limited this box during research, which confirms that ordering was wise).
Build RAM: raise `org.gradle.jvmargs=-Xmx3g` in `android/gradle.properties`; R8 on 50 MB of dependencies is slower
than the current 30-second build (expect a few minutes).

### 4.2 APK size and ABIs

The Tap to Pay AAR ships `arm64-v8a` and `armeabi-v7a` natives (≈12 MB and ≈9.5 MB uncompressed) plus Java code,
fonts and assets; `internal-common` is 26.6 MB of mostly Java/Kotlin code. Rough expectations (**estimate, measure
after the first build**): sideloaded APK with `abiFilters arm64-v8a` and R8 on: 25–30 MB; both ABIs, no R8: ~45 MB.
The R2 download path (`_build/website-business.apk`, served behind login at `/api/android.apk`) handles that size
fine. Google Play takes an **AAB** and splits per device.

### 4.3 Sideload or Play?

- **Sideload (today's path):** keep `android/build.sh`, R2, `/api/android.apk`, and the self-managed signing key.
  Works if Stripe's attestation does not require a Play install (§1.6, UNCONFIRMED). The signing fingerprint stays in
  `ASSET_LINKS` as now.
- **Google Play internal testing** (fallback, or simply the cleaner long-term path):
  - Account: US$25 one-time (https://support.google.com/googleplay/android-developer/answer/6112435). An
    **organization** account (Underground Associates LLC) needs a free D-U-N-S number from Dun & Bradstreet ("can take
    up to 30 days"), the legal address from the Google Payments profile, a website and verified contact email/phone
    (https://support.google.com/googleplay/android-developer/answer/13628312). A **personal** account is faster
    (ID + card) but personal accounts created after 13 Nov 2023 must run a **closed test with 12 opted-in testers for
    14 days** before they may publish to production (https://support.google.com/googleplay/android-developer/answer/14151465).
    That rule does **not** apply to the internal testing track, which is all this app needs: "An internal test can
    have up to 100 testers per app", releases reach testers "within minutes", and "internal tests might not be subject
    to standard Play policy or security reviews" (https://support.google.com/googleplay/android-developer/answer/9845334).
    Testers (owner, callers) install from a Play opt-in link; updates arrive through Play.
  - Upload format: an Android App Bundle (`gradle bundleRelease`); new apps go through **Play App Signing**, meaning
    Google holds the app signing key and your keystore becomes the upload key. Consequence for this repo: the
    certificate on installed APKs becomes **Google's app-signing certificate**, so its SHA-256 (Play Console → App
    integrity) must be added to `ASSET_LINKS` in `src/worker/index.ts` and deployed before anyone installs, or the TWA
    opens with Chrome's URL bar visible. Keep the old fingerprint so existing sideloads stay full-screen. Upside: a lost
    upload key can be reset through Play support, which removes the "signing key is not backed up anywhere" risk noted
    in `android/build.sh`.
  - Play forms to expect: app content declarations, data safety (location, phone state via the SDK), a privacy policy
    URL (undergroundassociates.com/privacy exists), and "Financial features" questionnaire because the app takes
    payments. Internal testing is lenient, but fill them in once.
  - **UNCONFIRMED:** whether Play's internal track counts as "licensed" for Play Integrity (it does for the licensing
    verdict in general, since the user "installed or updated your app from Google Play").

### 4.4 The phone itself

Fold 8: Developer options off (toggling them off is enough; no factory reset), NFC on, Location on, latest Samsung
security patch, no "Good Lock"/accessibility-type mods running during PIN entry, screen lock set. Samsung's own
Wallet/Samsung Pay on the same phone does not interfere with reader mode (the SDK uses NFC reader mode while the
tap screen is up); still, test once with a Google Pay phone as the "customer".

## 5. Compliance and operations

- **PCI scope.** Stripe's position for Terminal: in-person payments validate with **SAQ C**; "PCI Level 2–4 merchants
  can get a pre-filled SAQ C for Terminal transactions in the Dashboard under Compliance Settings"; Terminal is E2EE
  by default (https://support.stripe.com/questions/stripe-terminal-payments-and-pci-compliance). The online side stays
  SAQ A (Checkout). For Tap to Pay on Android specifically, Stripe says it "is actively undergoing an MPoC
  evaluation" and had earlier network assessments (https://docs.stripe.com/terminal/tap-to-pay-readers); the
  MPoC security-guidance page it links to was unreachable for us. **Action:** owner opens Dashboard → Settings →
  Compliance once a year, accepts the pre-filled SAQ, and never handles card numbers themselves. Our app never sees
  PAN data: the SDK encrypts in its own process and the Worker only ever holds Stripe ids.
- **Consent to save the card.** Covered by the signed agreement (card-on-file authorization, renewal, cancellation,
  how amounts are set); add the one-line sentence from §2.3 to the agreement and to the Tap screen; keep the signed
  copy (already done, `/agreement/<token>`). This is both a Stripe requirement and the card-network rule for
  merchant-initiated transactions.
- **Receipts.** Must be offered for every in-person payment (§2.7). Ask for an email on the sign-up form (already
  `signer_email`) and set `receipt_email`; print nothing.
- **Surcharging: don't.** Alabama has no state cap on *credit* surcharges, but federal rules forbid surcharging
  *debit*, networks cap at 3–4%, and disclosure at entry/point of sale/receipt is mandatory; several Stripe-based
  processors state surcharging is not applied on Tap to Pay devices at all. Prices are flat in `/terms`; keep them
  flat. (Sources: NCSL statute table and industry summaries; Stripe's own surcharging docs were not retrievable.)
- **Signature.** Not required for EMV contactless; the major US networks dropped signature requirements in 2018
  (general knowledge, not re-verified here). The SDK never asks for one; the signed agreement is our evidence.
- **What the customer must see.** The amount before they tap (Stripe's screen shows it; show it on ours too with the
  business name and "then $X every month from <date>"), the outcome, and the option of a receipt. Never ask for the
  card to be handed over to type numbers into the phone (that would be a keyed, card-not-present charge and breaks
  the PCI story); if tap fails, use the sign-up link on the client's own phone.
- **Owner responsibilities.** Keep the phone updated and unrooted with Developer options off; screen lock on; do not
  install screen recorders/accessibility overlays; Location and NFC on; one active reader connection at a time;
  reconcile the Stripe Dashboard against the app weekly (uncaptured or orphaned PaymentIntents); refunds through the
  app or Dashboard only; report a lost phone (rotate `APP_SECRET`, which signs out every session and kills tap tokens).
- **Taxes/legal.** Nothing Alabama-specific for card-present acceptance was found beyond surcharge disclosure; the
  LLC's existing Stripe account, terms and privacy policy cover in-person sales once the agreement sentence is added.
  Have the lawyer who reviews the agreement (CLAUDE.md to-do) glance at the card-on-file wording.

## 6. Build plan and estimates

| Step | Work | Estimate |
|---|---|---|
| 0. Prove the device and the install path | Install the Stripe Dashboard app on the Fold 8, take a $1 **test-mode** tap (proves account, country, device). Then a throwaway release-signed APK with the SDK, sideloaded via R2: `discoverReaders(isSimulated=false)` + `connectReader` in sandbox. Decide sideload vs Play. Order the physical test card. Subscribe to terminal-announce. | 0.5–1 day |
| 1. Stripe Dashboard | Confirm Terminal is active; create the Location (or let the app do it); note the account API version; add `STRIPE_TEST_SECRET_KEY` secret; webhook already live; add `payment_intent.succeeded`, `charge.refunded` events to the endpoint. | 1–2 h |
| 2. Worker | `src/worker/tap.ts`: tap session token, `/api/terminal/connection_token`, `/api/signups/:id/tap/start`, `/api/tap/session`, `/api/signups/:id/tap/complete` (Customer, PaymentIntent, generated_card, Subscription with anchor, `invoice_settings`), refund/cancel helper, webhook branch for `signup_tap`, daily reconciliation in the cron, migration (`signups.stripe_payment_intent`, `tap_tokens`), settings `terminalLocationId`. Tests in `test/worker/tap.test.ts` with a fake Stripe. Agreement + `/terms` sentence. | 1.5–2 days |
| 3. Web app | Lead screen / sign-up card: "Take payment by tap" button (owner + full access only, only after a signed sign-up), builds the `intent://` link on tap, polls status, shows paid/renewal; `#/install-app` fallback page; Plans & answers line. | 0.5 day |
| 4. Android | Kotlin plugin, `App.kt`, `TapToPayActivity` + layout, token provider, API client, error table, UX config, manifest; keep TWA bits; `abiFilters`; bump `versionCode`. | 2–3 days |
| 5. Spike/decision on the TWA hand-off (part of 4) | `intent://` from the TWA page to the activity, user gesture, return path. If it fails: WebView shell + bridge instead (+2–4 days, FCM later). | 0.5 day |
| 6. Testing | Simulated reader in debug (declines, PIN cards, refund-fail), release build in sandbox with the physical test card (`.00/.05/.03` amounts), test clock through two renewals, webhook paths, cancel/refund, $1 live tap + refund. | 1–2 days (plus test-card shipping) |
| 7. Distribution | Sideload: build.sh + R2 + "Download Android app" as today. Play: account ($25, D-U-N-S for the LLC), app record, data safety, internal testing release, add Play's signing fingerprint to `ASSET_LINKS`, opt-in links for owner and callers. | 0.5 day + waiting (D-U-N-S up to 30 days; Play identity checks days) |
| 8. Docs | CLAUDE.md section (routes, tokens, settings, build), owner one-pager (phone settings, how to take a tap, what to do on decline). | 0.5 day |

Total: roughly 8–11 developer days; calendar time 3–4 weeks because of the test card and account verifications.
Start steps 0 and 7's account creation in parallel on day one.

### Top 10 gotchas

1. **Debug builds cannot use the real reader.** Only release-signed, non-debuggable APKs on a phone with Developer
   options off can tap real cards; everything else must use `isSimulated = true`. Plan the sandbox-key path in the
   Worker so a release build can run test payments.
2. **Developer options on the owner's phone** turn every payment into `TAP_TO_PAY_INSECURE_ENVIRONMENT`. Say so in the
   app's error text.
3. **Security patch older than 12 months, or a Samsung update that lags**, silently ends Tap to Pay
   (`terminal_unsupported_android_patch`). Implement `onUpdateRequirementsAvailable` and show the deadline.
4. **Never create a second PaymentIntent after a decline or timeout**; retry the same one, or you double-authorize.
5. **`generated_card` can be null** (some wallets/single-branded debit). Handle it: payment stands, subscription needs
   a second tap (SetupIntent) or the online link.
6. **Double billing is a server bug waiting to happen.** With `billing_cycle_anchor(_config)` you must also pass
   `proration_behavior=none`; without it Stripe invoices a prorated first period immediately.
7. **The subscription charges are card-not-present**: 2.9% + 30¢ and no EMV liability shift; price accordingly and
   keep the signed agreement as evidence.
8. **The Terminal SDK runs a second copy of your `Application` in `:stripetaptopay`.** Guard with
   `TapToPay.isInTapToPayProcess()` and declare nothing of yours in that process.
9. **Chrome needs a user gesture for `intent://`** and the activity needs `exported=true` + `BROWSABLE`; the Chrome
   cookie is not available to the activity, so the one-time token is mandatory. If Play App Signing enters the
   picture, the `assetlinks.json` fingerprint changes.
10. **Compile requirements moved:** `compileSdk ≥ 35`, Kotlin 2.3.21, SDK 6.0.0 `TapUseCase.Pay(locationId)`; most
    blog posts and the React Native/Flutter wrappers still show 3.x/4.x `LocalMobile` APIs. Trust the 6.0 migration
    guide, not samples.

## 7. What could not be confirmed (test or ask Stripe)

- Whether a sideloaded, release-signed APK passes Stripe's attestation (§1.6). Evidence says yes; no written statement.
- Whether any Dashboard enablement is needed for Tap to Pay on a US account (no doc mentions one).
- The contents of Stripe's "MPoC Security Guidance" page for Tap to Pay on Android (404 on 10 Oct 2026); it may list
  merchant obligations (device hygiene, incident reporting).
- The Fold 8's NFC tap zone and whether the inner screen or the cover screen is the better reader surface.
- Behavior of US cards above common contactless amounts (yearly Pro, $1,490) on a tap: PIN prompt vs decline.
- Exact APK size after R8 and ABI filtering (estimate 25–30 MB).
- Whether Play internal-testing installs satisfy a Play-install check, should one exist.
- Whether the Stripe partner-portal Tap to Pay assets carry mandatory wording for Android (iPhone's rules come from
  Apple).

## Sources

Stripe docs
- Tap to Pay on Android: https://docs.stripe.com/terminal/payments/setup-reader/tap-to-pay?platform=android
- Tap to Pay readers / compliance: https://docs.stripe.com/terminal/tap-to-pay-readers
- Connect to the Tap to Pay reader (Android): https://docs.stripe.com/terminal/payments/connect-reader?reader-type=tap-to-pay&terminal-sdk-platform=android
- Set up the Android SDK (dependencies, permissions, connection token, init): https://docs.stripe.com/terminal/payments/setup-integration?terminal-sdk-platform=android
- Collect card payments (Android): https://docs.stripe.com/terminal/payments/collect-card-payment?terminal-sdk-platform=android
- Save payment details after payment (Android): https://docs.stripe.com/terminal/features/saving-payment-details/save-after-payment?terminal-sdk-platform=android
- Save directly without charging (SetupIntent): https://docs.stripe.com/terminal/features/saving-payment-details/save-directly?terminal-sdk-platform=android
- Saving payment details overview (subscriptions from in-person payments): https://docs.stripe.com/terminal/features/saving-payment-details/overview
- Refunds: https://docs.stripe.com/terminal/features/refunds?terminal-sdk-platform=android
- Receipts: https://docs.stripe.com/terminal/features/receipts
- Locations: https://docs.stripe.com/terminal/fleet/locations-and-zones?dashboard-or-api=api
- Testing (simulated reader, test cards, physical test card amounts): https://docs.stripe.com/terminal/references/testing
- Simulated reader (Android): https://docs.stripe.com/terminal/payments/connect-reader?reader-type=simulated&terminal-sdk-platform=android
- SDK 6.0 migration guide (Android): https://docs.stripe.com/terminal/references/sdk-migration-guide?terminal-sdk-platform=android
- SDK 5.0 migration guide (Android): https://docs.stripe.com/terminal/references/sdk-v5-migration-guide?terminal-sdk-platform=android
- SDK versioning and support schedule: https://docs.stripe.com/terminal/references/sdk-versioning
- Deployment checklist: https://docs.stripe.com/terminal/references/checklist
- Regional considerations (US): https://docs.stripe.com/terminal/payments/regional?integration-country=US
- Terminal overview: https://docs.stripe.com/terminal/overview
- No-code Tap to Pay with the Dashboard app: https://docs.stripe.com/no-code/in-person
- Create a PaymentIntent: https://docs.stripe.com/api/payment_intents/create
- Create a Subscription: https://docs.stripe.com/api/subscriptions/create
- Billing cycle anchor and proration: https://docs.stripe.com/billing/subscriptions/billing-cycle
- Free trials (trial_end, combining with anchor): https://docs.stripe.com/billing/subscriptions/trials/free-trials
- Dispute categories: https://docs.stripe.com/disputes/categories
- Pricing (US): https://stripe.com/pricing
- Terminal error codes (Android): https://stripe.dev/stripe-terminal-android/external/com.stripe.stripeterminal.external.models/-terminal-error-code/index.html
- Android SDK releases and changelog: https://github.com/stripe/stripe-terminal-android/releases, https://github.com/stripe/stripe-terminal-android/blob/master/CHANGELOG.md, README: https://github.com/stripe/stripe-terminal-android
- GitHub issues: #601 secure process https://github.com/stripe/stripe-terminal-android/issues/601, #669 Play required https://github.com/stripe/stripe-terminal-android/issues/669, #743 attestation https://github.com/stripe/stripe-terminal-android/issues/743
- Maven Central artifacts inspected: https://repo1.maven.org/maven2/com/stripe/stripeterminal-taptopay/6.0.0/, https://repo1.maven.org/maven2/com/stripe/stripeterminal-internal-common/6.0.0/

Stripe support
- Tap to Pay on Android security patch requirement: https://support.stripe.com/questions/tap-to-pay-on-android-security-patch-requirements
- Tap to Pay on iPhone or Android and Terminal (limits, PIN SDK versions, no P2PE/offline/tipping): https://support.stripe.com/questions/tap-to-pay-on-iphone-or-android-and-stripe-terminal
- Terminal payments and PCI (SAQ C, E2EE): https://support.stripe.com/questions/stripe-terminal-payments-and-pci-compliance
- How disputes work for Terminal: https://support.stripe.com/questions/how-disputes-work-for-terminal
- Regional contactless limits: https://support.stripe.com/questions/what-are-the-regional-contactless-limits-for-stripe-terminal-transactions

Google / Android
- Play Integrity verdicts: https://developer.android.com/google/play/integrity/verdicts
- How Stripe built the Tap to Pay SDK with Play (2023): https://android-developers.googleblog.com/2023/02/how-stripe-leveraged-google-play-to-build-an-sdk-for-tap-to-pay-on-android.html
- sdkmanager (deprecated in favor of `android sdk`): https://developer.android.com/tools/sdkmanager
- Command-line tools download: https://developer.android.com/studio#command-line-tools-only
- AGP 8.13 release notes (Gradle 8.13, JDK 17, build-tools 35, compileSdk 36.1): https://developer.android.com/build/releases/past-releases/agp-8-13-0-release-notes
- AGP current compatibility: https://developer.android.com/build/releases/gradle-plugin
- Kotlin Gradle plugin compatibility: https://kotlinlang.org/docs/gradle-configure-project.html
- WebView JavaScript binding and navigation: https://developer.android.com/develop/ui/views/layout/webapps/webview
- Chrome Android intents (`intent://`, fallback URL, user gesture): https://developer.chrome.com/docs/android/intents
- Play Console registration fee: https://support.google.com/googleplay/android-developer/answer/6112435
- Play account types / D-U-N-S: https://support.google.com/googleplay/android-developer/answer/13628312
- Testing requirements for new personal accounts: https://support.google.com/googleplay/android-developer/answer/14151465
- Internal / closed / open testing tracks: https://support.google.com/googleplay/android-developer/answer/9845334
- Prepare and roll out releases (app bundles, Play App Signing): https://support.google.com/googleplay/android-developer/answer/9859152

Other
- Alabama surcharge statutes (none) and federal debit rule: https://www.ncsl.org/financial-services/credit-or-debit-card-surcharges-statutes, https://merchantcostconsulting.com/lower-credit-card-processing-fees/alabama-surcharge-laws/
- Web Push unsupported in Android WebView: https://pushpad.xyz/blog/can-i-use-the-web-push-api-with-hybrid-mobile-apps
