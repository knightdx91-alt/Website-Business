package com.knightdx91.websitebusiness.net

import org.json.JSONObject

/** One clock-in / clock-out shift (`/api/clock`). `day` is the Cullman date it started on. */
data class ClockEntry(
    val id: String,
    val userId: String,
    val userName: String,
    val clockIn: Long,
    val clockOut: Long?,
    val day: String,
    val minutes: Int,
    val note: String,
    val rateCents: Long?,
    val payCents: Long,
    val editedBy: String?,
) {
    companion object {
        fun from(j: JSONObject) = ClockEntry(
            j.optString("id"), j.optString("userId"), j.optString("userName", ""), j.optLong("clockIn"),
            if (j.isNull("clockOut") || !j.has("clockOut")) null else j.optLong("clockOut"),
            j.optString("day"), j.optInt("minutes"), j.optString("note", ""),
            if (j.isNull("rateCents") || !j.has("rateCents")) null else j.optLong("rateCents"),
            j.optLong("payCents"), j.str("editedBy"),
        )
    }
}

data class ClockStatus(
    val canClock: Boolean,
    val hourlyCents: Long?,
    val open: ClockEntry?,
    val todayMinutes: Int,
    val weekMinutes: Int,
    val weekPayCents: Long,
    val entries: List<ClockEntry>,
) {
    companion object {
        fun from(j: JSONObject) = ClockStatus(
            j.optBoolean("canClock"),
            if (j.isNull("hourlyCents") || !j.has("hourlyCents")) null else j.optLong("hourlyCents"),
            j.optJSONObject("open")?.let { ClockEntry.from(it) },
            j.optJSONObject("today")?.optInt("minutes") ?: 0,
            j.optJSONObject("week")?.optInt("minutes") ?: 0,
            j.optJSONObject("week")?.optLong("payCents") ?: 0,
            j.optJSONArray("entries").objects().map { ClockEntry.from(it) },
        )
    }
}

data class TeamPerson(val userId: String, val name: String, val hourlyCents: Long?, val minutes: Int, val payCents: Long, val open: Boolean, val entries: List<ClockEntry>)

data class TeamWeek(val from: String, val to: String, val people: List<TeamPerson>, val totalMinutes: Int, val totalPayCents: Long) {
    companion object {
        fun from(j: JSONObject) = TeamWeek(
            j.optString("from"), j.optString("to"),
            j.optJSONArray("people").objects().map { p ->
                TeamPerson(
                    p.optString("userId"), p.optString("name", ""),
                    if (p.isNull("hourlyCents") || !p.has("hourlyCents")) null else p.optLong("hourlyCents"),
                    p.optInt("minutes"), p.optLong("payCents"), p.optBoolean("open"),
                    p.optJSONArray("entries").objects().map { ClockEntry.from(it) },
                )
            },
            j.optInt("totalMinutes"), j.optLong("totalPayCents"),
        )
    }
}

suspend fun Api.clockStatus(): ClockStatus = ClockStatus.from(getJson("/clock"))

suspend fun Api.clockIn(note: String): ClockEntry =
    ClockEntry.from(postJson("/clock/in", JSONObject().apply { if (note.isNotBlank()) put("note", note) }).getJSONObject("entry"))

suspend fun Api.clockOut(note: String): ClockEntry =
    ClockEntry.from(postJson("/clock/out", JSONObject().apply { if (note.isNotBlank()) put("note", note) }).getJSONObject("entry"))

suspend fun Api.teamWeek(week: String?): TeamWeek = TeamWeek.from(getJson("/clock/team" + (week?.let { "?week=$it" } ?: "")))

suspend fun Api.timesheetCsv(week: String): ByteArray = bytes("/api/clock/team.csv?week=$week")

/** Picked Cullman date + times for a shift; `outDay` only when clock-out is on the next day. */
private fun shiftBody(inDay: String, inTime: String, outDay: String?, outTime: String?, note: String) = JSONObject()
    .put("inDay", inDay).put("inTime", inTime)
    .put("outDay", outDay ?: JSONObject.NULL).put("outTime", outTime ?: JSONObject.NULL)
    .put("note", note.ifBlank { null } ?: JSONObject.NULL)

suspend fun Api.editShift(id: String, inDay: String, inTime: String, outDay: String?, outTime: String?, note: String) =
    putJson("/clock/entries/$id", shiftBody(inDay, inTime, outDay, outTime, note))

suspend fun Api.addShift(userId: String, inDay: String, inTime: String, outDay: String?, outTime: String, note: String) =
    postJson("/clock/entries", shiftBody(inDay, inTime, outDay, outTime, note).put("userId", userId))

suspend fun Api.deleteShift(id: String) = deleteJson("/clock/entries/$id")

suspend fun Api.setHourlyPay(userId: String, cents: Long?) =
    putJson("/clock/pay/$userId", JSONObject().put("hourlyCents", cents ?: JSONObject.NULL))

/** Any change to a task: title, notes, due (YYYY-MM-DD or null), dueTime (HH:MM or null), assignee. */
suspend fun Api.updateTask(id: String, change: JSONObject) = putJson("/tasks/$id", change)
