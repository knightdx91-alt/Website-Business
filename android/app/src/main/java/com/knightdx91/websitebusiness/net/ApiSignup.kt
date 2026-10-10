package com.knightdx91.websitebusiness.net

import org.json.JSONArray
import org.json.JSONObject
import java.net.URLEncoder

/*
 * The in-person sign-up on the owner's phone (ui/SignupScreen.kt): the agreement as sections, the signed order, and
 * paying right here with a card typed into Stripe's PaymentSheet. Tap to Pay keeps using Api.startTap (Api.kt) and
 * tap/TapToPayActivity. Plans, ways to pay and extras come from Api.planOptions (ApiContent.kt).
 */

data class ContractSection(val heading: String, val text: String)

/** `GET /api/contract.json`: the exact agreement for a plan + way to pay + extras, as headed sections. */
data class ContractDoc(val title: String, val sections: List<ContractSection>) {
    companion object {
        fun from(j: JSONObject) = ContractDoc(
            j.optString("title", "Agreement"),
            j.optJSONArray("sections").objects().map { ContractSection(it.optString("heading"), it.optString("text")) },
        )
    }
}

/** One extra on the order: its index in Settings → Extras (the order `planOptions.addons` comes in) and how many. */
data class ExtraPick(val index: Int, val qty: Int)

private fun enc(s: String) = URLEncoder.encode(s, "UTF-8")

/** `0:1,3:2`: the `picks=` query form of the extras. */
fun picksParam(picks: List<ExtraPick>): String = picks.joinToString(",") { "${it.index}:${it.qty}" }

suspend fun Api.contractJson(leadId: String, plan: String, billing: String, picks: List<ExtraPick>): ContractDoc =
    ContractDoc.from(getJson("/contract.json?lead=${enc(leadId)}&plan=${enc(plan)}&billing=${enc(billing)}&picks=${enc(picksParam(picks))}"))

/** What `POST /api/leads/:id/signups` answers once the agreement is signed. */
data class SignupResult(
    val signupId: String,
    val dueCents: Long,
    /** What renews (cents) and how often ("month" / "year"); null when nothing renews. */
    val renewsCents: Long?,
    val renewsInterval: String?,
    /** They pay against an invoice (check or bank transfer); nothing is charged online. */
    val invoice: Boolean,
    /** Stripe Checkout link to text them, when online payment is set up and this is not an invoice order. */
    val checkoutUrl: String?,
    /** API path of the signed agreement PDF (open with the `pdf` route). */
    val agreementPdf: String,
    /** Tap to Pay is set up on this account, so the card can be tapped on this phone. */
    val tapReady: Boolean,
    /** Stripe is set up, so a card can be typed into PaymentSheet on this phone. */
    val cardReady: Boolean,
) {
    companion object {
        fun from(j: JSONObject): SignupResult {
            val renews = j.optJSONObject("renews")
            return SignupResult(
                signupId = j.optString("signupId"),
                dueCents = j.optLong("dueCents", 0L),
                renewsCents = renews?.optLong("amountCents"),
                renewsInterval = renews?.str("interval"),
                invoice = j.optBoolean("invoice"),
                checkoutUrl = j.str("checkoutUrl"),
                agreementPdf = j.optString("agreementPdf"),
                tapReady = j.optBoolean("tapReady"),
                cardReady = j.optBoolean("cardReady"),
            )
        }
    }
}

/**
 * Saves the signed order. `signature` is a PNG data URL (600×200, black strokes on white, 2,000–200,000 characters);
 * `name` must be a full name (contains a space).
 */
suspend fun Api.createSignup(
    leadId: String,
    plan: String,
    billing: String,
    picks: List<ExtraPick>,
    business: String,
    name: String,
    title: String,
    email: String,
    signature: String,
): SignupResult {
    val body = JSONObject()
        .put("plan", plan)
        .put("billing", billing)
        .put("picks", JSONArray().also { a -> picks.forEach { a.put(JSONObject().put("index", it.index).put("qty", it.qty)) } })
        .put("business", business)
        .put("name", name)
        .put("title", title)
        .put("email", email)
        .put("signature", signature)
        .put("consent", true)
    return SignupResult.from(postJson("/leads/$leadId/signups", body))
}

/** `POST /api/signups/:id/pay/start`: a SetupIntent for PaymentSheet to collect the card on this phone. */
data class PayStart(val clientSecret: String, val publishableKey: String) {
    /** `seti_…`: the SetupIntent id is the part of the client secret before `_secret_`. */
    val setupIntentId: String get() = clientSecret.substringBefore("_secret_")

    companion object {
        fun from(j: JSONObject) = PayStart(j.optString("clientSecret"), j.optString("publishableKey"))
    }
}

suspend fun Api.payStart(signupId: String): PayStart = PayStart.from(postJson("/signups/$signupId/pay/start"))

/** `POST /api/signups/:id/pay/complete`: the first charge and the subscription, once the card is saved. */
data class PayDone(val ok: Boolean, val amountCents: Long, val card: String?, val renewsOn: String?, val message: String?) {
    companion object {
        fun from(j: JSONObject) = PayDone(j.optBoolean("ok"), j.optLong("amountCents", 0L), j.str("card"), j.str("renewsOn"), j.str("message"))
    }
}

suspend fun Api.payComplete(signupId: String, setupIntentId: String): PayDone =
    PayDone.from(postJson("/signups/$signupId/pay/complete", JSONObject().put("setupIntentId", setupIntentId)))
