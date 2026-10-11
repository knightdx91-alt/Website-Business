package com.knightdx91.websitebusiness.net

import org.json.JSONObject

/*
 * 🎓 Training: the course from `GET /api/training` (one source with the web app) and this person's finished lessons;
 * `PUT /api/training/progress {lesson, done}` marks one. Owner and callers.
 */

data class CheckQuestion(val q: String, val options: List<String>, val answer: Int, val why: String)

data class Lesson(val id: String, val title: String, val minutes: Int, val who: String, val why: String, val steps: List<String>, val tryIt: String?, val check: List<CheckQuestion>) {
    val ownerStep get() = who == "owner"
}

data class Course(val lessons: List<Lesson>, val done: Set<String>)

private fun lesson(j: JSONObject) = Lesson(
    id = j.optString("id"),
    title = j.optString("title"),
    minutes = j.optInt("minutes", 3),
    who = j.optString("who", "everyone"),
    why = j.optString("why"),
    steps = j.optJSONArray("steps").strings(),
    tryIt = j.str("tryIt"),
    check = j.optJSONArray("check").objects().map { c -> CheckQuestion(c.optString("q"), c.optJSONArray("options").strings(), c.optInt("answer", 0), c.optString("why")) },
)

suspend fun Api.training(): Course {
    val j = getJson("/training")
    return Course(j.optJSONArray("lessons").objects().map { lesson(it) }, j.optJSONArray("done").strings().toSet())
}

suspend fun Api.markLesson(id: String, done: Boolean): Set<String> =
    putJson("/training/progress", JSONObject().put("lesson", id).put("done", done)).optJSONArray("done").strings().toSet()
