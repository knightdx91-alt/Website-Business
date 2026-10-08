/**
 * Source of the one small script every site ships. Plain ES5-ish JS so it runs on old phones.
 * OPEN_STATUS_SRC is kept separate so tests can evaluate the exact code that ships.
 */

export const OPEN_STATUS_SRC = String.raw`
function fmtTime(hhmm) {
  if (hhmm === "24:00" || hhmm === "00:00") return "midnight";
  var p = hhmm.split(":"), h = +p[0], m = +p[1];
  if (h === 12 && m === 0) return "noon";
  var s = h >= 12 ? "PM" : "AM", h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? h12 + " " + s : h12 + ":" + (m < 10 ? "0" + m : m) + " " + s;
}
function toMin(hhmm) { var p = hhmm.split(":"); return +p[0] * 60 + +p[1]; }
var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** hours: {weekly: [[{open,close}]...7], open24_7}; now: {day: 0-6, minutes: 0-1439} */
function openStatus(hours, now) {
  if (hours.open24_7) return { open: true, text: "Open 24 hours" };
  var w = hours.weekly, today = w[now.day] || [], i, iv, o, c;
  var prev = w[(now.day + 6) % 7] || [];
  for (i = 0; i < prev.length; i++) {
    o = toMin(prev[i].open); c = toMin(prev[i].close);
    if (c < o && now.minutes < c) return { open: true, text: "Open now · closes " + fmtTime(prev[i].close) };
  }
  for (i = 0; i < today.length; i++) {
    iv = today[i]; o = toMin(iv.open); c = toMin(iv.close);
    if (c <= o) c += 1440;
    if (now.minutes >= o && now.minutes < c) {
      if (iv.open === "00:00" && iv.close === "24:00") return { open: true, text: "Open all day" };
      return { open: true, text: "Open now · closes " + fmtTime(iv.close) };
    }
  }
  for (i = 0; i < today.length; i++) {
    if (toMin(today[i].open) > now.minutes) return { open: false, text: "Closed · opens " + fmtTime(today[i].open) };
  }
  for (var k = 1; k <= 7; k++) {
    var d = (now.day + k) % 7, next = w[d] || [];
    if (next.length) return { open: false, text: "Closed · opens " + (k === 1 ? "tomorrow" : DAYS[d]) + " " + fmtTime(next[0].open) };
  }
  return { open: false, text: "Closed" };
}
function nowIn(tz) {
  var parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  var get = function (t) { for (var i = 0; i < parts.length; i++) if (parts[i].type === t) return parts[i].value; return ""; };
  return { day: DAYS.indexOf(get("weekday")), minutes: (+get("hour") % 24) * 60 + +get("minute") };
}
`;

export const CLIENT_SCRIPT = `(function () {
"use strict";
var d = document, root = d.documentElement;
root.className = root.className.replace("no-js", "js");
${OPEN_STATUS_SRC}
var btn = d.querySelector("[data-nav-toggle]"), nav = d.getElementById("site-nav");
function setNav(open) {
  if (!btn || !nav) return;
  btn.setAttribute("aria-expanded", String(open));
  nav.classList.toggle("is-open", open);
  d.body.classList.toggle("nav-open", open);
}
if (btn && nav) {
  btn.addEventListener("click", function () {
    var open = btn.getAttribute("aria-expanded") !== "true";
    setNav(open);
    if (open) { var a = nav.querySelector("a"); if (a) a.focus(); }
  });
  nav.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("a")) setNav(false); });
  d.addEventListener("keydown", function (e) { if (e.key === "Escape" && nav.classList.contains("is-open")) { setNav(false); btn.focus(); } });
}
var hdr = d.querySelector(".hdr"), last = window.scrollY;
window.addEventListener("scroll", function () {
  var y = window.scrollY;
  if (hdr && !(nav && nav.classList.contains("is-open"))) hdr.classList.toggle("is-hidden", y > last && y > 160);
  last = y;
}, { passive: true });
var bar = d.querySelector(".bar"), heroActions = d.querySelector("[data-hero-actions]");
if (bar && heroActions && "IntersectionObserver" in window) {
  new IntersectionObserver(function (es) { bar.classList.toggle("is-hidden", es[0].isIntersecting); }).observe(heroActions);
}
d.addEventListener("focusin", function (e) { if (bar && e.target.matches && e.target.matches("input,textarea,select")) bar.classList.add("is-typing"); });
d.addEventListener("focusout", function () { if (bar) bar.classList.remove("is-typing"); });
var hd = d.getElementById("hours-data");
if (hd) {
  try {
    var data = JSON.parse(hd.textContent), now = nowIn(data.tz), st = openStatus(data.hours, now);
    var els = d.querySelectorAll("[data-open-status]");
    for (var i = 0; i < els.length; i++) {
      els[i].textContent = st.text;
      els[i].classList.add(st.open ? "is-open" : "is-closed");
      els[i].hidden = false;
    }
    var rows = d.querySelectorAll("[data-day='" + now.day + "']");
    for (var j = 0; j < rows.length; j++) rows[j].classList.add("is-today");
  } catch (err) {}
}
var fy = d.querySelectorAll("[data-year]");
for (var y = 0; y < fy.length; y++) fy[y].textContent = String(new Date().getFullYear());
})();
`;
