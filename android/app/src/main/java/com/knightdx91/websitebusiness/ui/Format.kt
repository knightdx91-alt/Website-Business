package com.knightdx91.websitebusiness.ui

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone

val CULLMAN: TimeZone = TimeZone.getTimeZone("America/Chicago")

fun ago(ms: Long?): String {
    if (ms == null || ms <= 0) return ""
    val d = System.currentTimeMillis() - ms
    val m = d / 60_000
    return when {
        m < 1 -> "just now"
        m < 60 -> "$m min ago"
        m < 48 * 60 -> "${m / 60} h ago"
        else -> "${m / (24 * 60)} d ago"
    }
}

fun money(cents: Long): String = if (cents % 100 == 0L) "$" + (cents / 100) else String.format(Locale.US, "$%.2f", cents / 100.0)
fun moneyDollars(d: Double): String = if (d == Math.floor(d)) "$" + d.toLong() else String.format(Locale.US, "$%.2f", d)

/** Today (or today + n days) as YYYY-MM-DD in Cullman time, the way the Worker stores callbacks. */
fun dayFromNow(days: Int): String {
    val c = Calendar.getInstance(CULLMAN)
    c.add(Calendar.DAY_OF_MONTH, days)
    val f = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    f.timeZone = CULLMAN
    return f.format(c.time)
}

fun niceDay(day: String?): String {
    if (day == null) return ""
    val today = dayFromNow(0)
    return when {
        day == today -> "today"
        day == dayFromNow(1) -> "tomorrow"
        day < today -> "overdue ($day)"
        else -> day
    }
}

fun dateTime(ms: Long): String {
    val f = SimpleDateFormat("MMM d, h:mm a", Locale.US)
    f.timeZone = CULLMAN
    return f.format(Date(ms))
}

fun phoneDigits(phone: String?): String = (phone ?: "").filter { it.isDigit() }.let { if (it.length == 11 && it.startsWith("1")) it.drop(1) else it }

fun Context.dial(phone: String?) {
    val d = phoneDigits(phone)
    if (d.isEmpty()) return toast("No phone number")
    startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:+1$d")))
}

fun Context.sms(phone: String?, body: String) {
    val d = phoneDigits(phone)
    if (d.isEmpty()) return toast("No phone number")
    startActivity(Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:+1$d")).putExtra("sms_body", body))
}

fun Context.openUrl(url: String) {
    runCatching { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }.onFailure { toast("Nothing can open that") }
}

fun Context.directions(address: String?, lat: Double?, lng: Double?) {
    val uri = if (lat != null && lng != null) "geo:0,0?q=$lat,$lng(${Uri.encode(address ?: "")})" else "geo:0,0?q=${Uri.encode(address ?: "")}"
    openUrl(uri)
}

fun Context.toast(text: String) = Toast.makeText(this, text, Toast.LENGTH_SHORT).show()

val CATEGORY_LABEL = mapOf(
    "restaurant" to "Restaurant", "contractor" to "Contractor", "salon" to "Salon", "auto" to "Auto", "landscaping" to "Lawn & landscape",
    "cleaning" to "Cleaning", "print" to "Print & signs", "retail" to "Shop", "finance" to "Tax & finance", "church" to "Church / nonprofit",
)

fun categoryLabel(id: String) = CATEGORY_LABEL[id] ?: id.replaceFirstChar { it.uppercase() }

val SALES_LABEL = mapOf("new" to "New", "shown" to "Shown", "sold" to "Sold", "live" to "Live", "not_interested" to "Not interested")

val OUTCOME_LABEL = linkedMapOf(
    "no_answer" to "No answer", "reached" to "Reached", "shown" to "Showed them", "callback" to "Call back", "sold" to "Sold 🎉", "not_interested" to "Not interested", "note" to "Just a note",
)
