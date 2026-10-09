"use strict";
(function () {
  const $app = document.getElementById("app");
  const $toast = document.getElementById("toast");
  const $nav = document.getElementById("topnav");
  let meta = null;
  let pollTimer = null;
  let installPrompt = null;
  const filters = { sales: "new", category: "" };
  // Every route() bumps this; async views compare their copy after each await and stop if another screen took over.
  let renderSeq = 0;
  const stale = (my) => my !== renderSeq;
  // Per-view cleanup (event listeners on window, media queries): route() runs them before the next screen.
  const cleanups = [];
  const onLeave = (fn) => cleanups.push(fn);
  // A view with unsaved typing sets this; render() asks before leaving.
  let leaveGuard = null;
  let ignoreHashOnce = false;

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const telHref = (phone) => "tel:+1" + String(phone || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  /** A lead's 10 phone digits, from the built record when there is one, else the Google/typed-in number. */
  const phoneDigits = (l) => (l.record ? l.record.phone.e164.slice(2) : String(l.phone || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, ""));
  const ago = (ms) => {
    const m = Math.round((Date.now() - ms) / 60000);
    if (m < 1) return "just now";
    if (m < 60) return m + " min ago";
    const h = Math.round(m / 60);
    if (h < 24) return h + " hr ago";
    return Math.round(h / 24) + " days ago";
  };
  const CATEGORY_LABEL = { restaurant: "Restaurant", contractor: "Contractor", salon: "Salon", auto: "Auto", landscaping: "Landscaping", cleaning: "Cleaning", print: "Print & signs", retail: "Shop", finance: "Tax & finance", church: "Church & nonprofit" };
  const groupLabel = (id) => ((meta && meta.categories.find((c) => c.id === id)) || {}).label || CATEGORY_LABEL[id] || id;
  const GOOGLE_PER_SEARCH = 0.064; // up to 2 pages of Text Search per search phrase
  const SALES = [["new", "New"], ["callbacks", "Callbacks"], ["shown", "Shown"], ["sold", "Sold"], ["live", "Live"], ["not_interested", "Not interested"], ["", "All"]];
  const OUTCOME_LABEL = { no_answer: "📵 No answer", reached: "📞 Reached", callback: "📅 Call back", shown: "👍 Interested", sold: "🎉 Sold", not_interested: "✋ Not interested", link_sent: "📲 Preview link texted", signup_sent: "📝 Sent sign-up link", signed: "✍️ Signed up" };
  const LOST_REASONS = [["price", "Price"], ["has_someone", "Has someone"], ["no_need", "No need"], ["timing", "Timing"], ["other", "Other"]];
  const NO_CONNECTION = "No connection. Check your signal and try again.";
  const money = (n) => "$" + (Number.isInteger(n) ? n : Number(n).toFixed(2));
  const isOwner = () => !meta || !meta.me || meta.me.role === "owner";

  // Dates are calendar days (YYYY-MM-DD) in the phone's time zone, which is Cullman time.
  const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const dayFromNow = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return isoDay(d); };
  const dayLabel = (iso) => {
    if (!iso) return "";
    if (iso === dayFromNow(0)) return "today";
    if (iso === dayFromNow(1)) return "tomorrow";
    const [y, mo, da] = iso.split("-").map(Number);
    return new Date(y, mo - 1, da).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  };
  const followChip = (iso) => {
    if (!iso) return "";
    const late = iso < dayFromNow(0);
    const due = iso <= dayFromNow(0);
    return `<span class="chip ${due ? "chip--warn" : ""}">📅 ${late ? "Overdue: " : "Call back "}${esc(dayLabel(iso))}</span>`;
  };
  // Rough Claude cost per site at Opus 5.5 rates, measured on real Cullman runs.
  const COST_PER_SITE = { restaurant: 0.04, contractor: 0.1, salon: 0.06, auto: 0.1, landscaping: 0.1, cleaning: 0.1, print: 0.1, retail: 0.06, finance: 0.1, church: 0.06 };
  const MODEL_FACTOR = { "claude-opus-5-5": 1, "claude-sonnet-5-5": 0.5, "claude-haiku-5-5": 0.03 };

  function toast(msg) {
    $toast.textContent = msg;
    $toast.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => ($toast.hidden = true), 3500);
  }

  async function api(path, opts = {}) {
    const init = { method: opts.method || "GET", headers: { "x-wb": "1" }, credentials: "same-origin" };
    if (opts.keepalive) init.keepalive = true;
    if (opts.json !== undefined) {
      init.headers["content-type"] = "application/json";
      init.body = JSON.stringify(opts.json);
    } else if (opts.body) {
      init.headers["content-type"] = opts.type;
      init.body = opts.body;
    }
    let res;
    try { res = await fetch("/api" + path, init); } catch (e) {
      // fetch only throws when the request never got through: no signal, airplane mode, server unreachable.
      const err = new Error(NO_CONNECTION);
      err.offline = true;
      throw err;
    }
    if (opts.raw && res.ok) return res;
    let data = {};
    try { data = await res.json(); } catch (e) { /* empty */ }
    if (res.status === 401 && !path.startsWith("/auth")) {
      location.hash = "#/login";
      throw new Error("Please log in");
    }
    if (!res.ok) {
      const err = new Error(data.error || "Something went wrong");
      err.data = data;
      err.status = res.status;
      throw err;
    }
    return data;
  }

  function stopPolling() {
    clearTimeout(pollTimer);
    pollTimer = null;
  }

  function setNav(active) {
    $nav.hidden = active === "login";
    $nav.querySelector("[data-nav=inbox]").hidden = !isOwner();
    $nav.querySelector("[data-nav=sales]").hidden = !isOwner();
    if (active !== "login") refreshNotifCount();
    $nav.querySelectorAll("a").forEach((a) => a.classList.toggle("is-active", a.dataset.nav === active));
  }

  /* ---------- login ---------- */
  async function viewLogin() {
    meta = null;
    setNav("login");
    const state = await api("/auth/state");
    if (state.loggedIn) return go("#/");
    const setup = !state.hasOwner;
    $app.innerHTML = `<div class="login card">
      <h1>${setup ? "Create your password" : "Log in"}</h1>
      <p class="muted">${setup ? "First time here. Pick a password only you know. You'll use it to open the app on any device." : "Enter your password. Callers use the password the owner gave them."}</p>
      <form id="f">
        <label class="field">Password<input type="password" name="password" autocomplete="${setup ? "new-password" : "current-password"}" minlength="${setup ? 8 : 1}" required></label>
        ${setup ? `<label class="field">Type it again<input type="password" name="again" autocomplete="new-password" required></label>` : ""}
        <button class="btn btn--primary" type="submit">${setup ? "Create password" : "Log in"}</button>
      </form></div>`;
    $app.querySelector("#f").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      if (setup && fd.get("password") !== fd.get("again")) return toast("The passwords don't match");
      try {
        await api(setup ? "/auth/setup" : "/auth/login", { method: "POST", json: { password: fd.get("password") } });
        meta = null;
        const next = new URLSearchParams(location.search).get("next");
        if (next && next.startsWith("/p/")) location.href = next;
        else go("#/");
      } catch (err) {
        toast(err.message);
      }
    });
  }

  /* ---------- home ---------- */
  function estimate(cats, cap) {
    const model = meta.settings.copyModel;
    const per = cats.length ? cats.reduce((s, id) => s + (COST_PER_SITE[(meta.categories.find((c) => c.id === id) || {}).category] || 0.08), 0) / cats.length : 0;
    return (per * cap * (MODEL_FACTOR[model] ?? 1)).toFixed(2);
  }
  function googleEstimate(cats, wider) {
    const n = cats.reduce((s, id) => { const g = meta.categories.find((c) => c.id === id); return s + (g ? (wider ? g.widerSearches : g.searches) : 0); }, 0);
    return (n * GOOGLE_PER_SEARCH).toFixed(2);
  }

  function runCard() {
    const cap = meta.settings.defaultCap;
    return `<section class="card"><h2>Find leads &amp; build sites</h2>
      <form id="run">
        <p class="muted small">Pick categories, then tap Run. It keeps going in the cloud even if you lock your phone.</p>
        <div class="chips" role="group" aria-label="Categories">${meta.categories
          .map((c, i) => `<label class="pick"><input type="checkbox" name="cat" value="${esc(c.id)}"${i === 0 ? " checked" : ""}>${esc(c.label)}</label>`)
          .join("")}</div>
        <p style="margin:8px 0 0"><button type="button" class="btn btn--small" id="allcats">Pick all</button></p>
        <div style="margin-top:12px">
          <label class="check"><input type="checkbox" name="wider"> Also search nearby towns <span class="hint">(Hartselle, Arab, Hanceville, Good Hope, Vinemont)</span></label>
          <label class="check"><input type="checkbox" name="badSites"> Also find businesses with outdated or broken websites</label>
        </div>
        <label class="field" style="margin-top:14px">Most sites to build this run
          <input type="number" name="cap" min="1" max="500" value="${cap}" inputmode="numeric">
          <span class="hint" id="est"></span></label>
        <button class="btn btn--primary" type="submit">Run</button>
      </form></section>`;
  }

  function runsHtml(runs) {
    if (!runs.length) return "";
    return `<section class="card"><h2>Recent runs</h2>${runs
      .slice(0, 3)
      .map((r) => {
        const c = r.counts;
        const total = Object.values(c).reduce((a, b) => a + b, 0);
        const finished = (c.ready || 0) + (c.failed || 0);
        const searching = r.searchesDone < r.searchesTotal;
        const pct = searching ? Math.round((r.searchesDone / Math.max(r.searchesTotal, 1)) * 20) : total ? 20 + Math.round((finished / total) * 80) : 100;
        const label = searching
          ? `Searching Google… (${r.searchesDone}/${r.searchesTotal})`
          : r.done
            ? `Done · ${c.ready || 0} sites ready${c.failed ? ` · ${c.failed} failed` : ""}`
            : `Building sites… ${finished} of ${total}`;
        const opts = [r.options && r.options.wider ? "nearby towns" : "", r.options && r.options.badSites ? "outdated sites" : ""].filter(Boolean);
        return `<div><div class="row"><strong>${esc(r.categories.map(groupLabel).join(", "))}${opts.length ? ` <span class="muted small">+ ${esc(opts.join(", "))}</span>` : ""}</strong><span class="muted small" style="text-align:right">${ago(r.createdAt)}</span></div>
          <div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
          <p class="small muted" style="margin:0 0 10px">${r.done ? "" : '<span class="spin"></span> '}${esc(label)}</p></div>`;
      })
      .join("")}</section>`;
  }

  function statusChip(l) {
    if (l.salesStatus === "live") return `<span class="chip chip--good">● Live</span>`;
    if (l.salesStatus === "not_interested") return `<span class="chip">Not interested</span>`;
    if (l.status === "queued") return `<span class="chip">Waiting</span>`;
    if (l.status === "building") return `<span class="chip"><span class="spin"></span> Building</span>`;
    if (l.status === "failed") return `<span class="chip chip--bad">Build failed</span>`;
    return `<span class="chip chip--good">Site ready</span>`;
  }

  function leadCard(l) {
    const rating = l.rating ? `<span class="stars">★ ${l.rating.toFixed(1)}</span>` : "";
    return `<li class="card lead">
      <div class="lead__top"><a class="lead__name" href="#/lead/${l.id}">${esc(l.name)}</a>${statusChip(l)}</div>
      <div class="lead__meta">${esc(CATEGORY_LABEL[l.category] || l.category)} · ${esc(l.reason || "")} ${rating ? "· " + rating : ""}</div>
      <div class="lead__meta">${esc(l.address || "")}</div>
      ${contactLine(l) ? `<div class="lead__meta">${contactLine(l)}</div>` : ""}
      ${l.followUp && (l.salesStatus === "new" || l.salesStatus === "shown") ? `<div>${followChip(l.followUp)}</div>` : ""}
      <div class="btns btns--full">
        ${l.status === "ready" ? `<a class="btn btn--small btn--primary" href="#/pitch/${l.id}">📞 Call guide</a>` : `<a class="btn btn--small" href="${telHref(l.phone)}">📞 Call</a>`}
        ${l.status === "ready" ? `<a class="btn btn--small" href="#/preview/${l.id}">Preview</a>` : ""}
        <a class="btn btn--small" href="#/lead/${l.id}">Details</a>
      </div></li>`;
  }

  async function viewHome() {
    setNav("home");
    const my = renderSeq;
    meta = meta || (await api("/meta"));
    if (stale(my)) return;
    if (!document.getElementById("leads")) {
      $app.innerHTML = `<div class="split"><div>${isOwner() ? runCard() : `<section class="card"><h2>Hi ${esc(meta.me.name)}</h2><p class="muted small">Open a lead's <strong>Call guide</strong> before you call. After each call, log how it went so callbacks show up here on the right day.</p></section>`}<div id="pushask"></div><div id="today"></div><div id="unpaid"></div><div id="runs"></div></div><div><section>
        <div class="btns btns--full" style="margin-bottom:12px"><a class="btn" href="#/add">➕ Add a business</a><a class="btn" href="#/route">🗺️ Walk-in route</a><a class="btn" href="#/walkin">🚶 In-person guide</a><a class="btn" href="#/playbook">💬 Plans & answers</a><a class="btn" href="#/plans">📋 Show plans</a></div>
        <div class="tabs" role="tablist">${SALES.map(([k, l]) => `<button type="button" data-sales="${k}" class="${filters.sales === k ? "is-on" : ""}">${l}</button>`).join("")}</div>
        <label class="field"><span class="sr-only">Category</span><select id="catfilter"><option value="">All categories</option>${meta.categories
          .map((c) => `<option value="${esc(c.id)}"${filters.category === c.id ? " selected" : ""}>${esc(c.label)}</option>`)
          .join("")}</select></label>
        <ul class="list" id="leads"><li class="muted">Loading…</li></ul></section></div></div>`;
      const form = $app.querySelector("#run");
      if (form) {
      const updateEst = () => {
        const cats = [...form.querySelectorAll("input[name=cat]:checked")].map((i) => i.value);
        const cap = Number(form.cap.value) || 0;
        $app.querySelector("#est").textContent = cats.length ? `Up to ${cap} sites. Writing costs about $${estimate(cats, cap)} at most, plus up to $${googleEstimate(cats, form.wider.checked)} for Google searches.` : "Pick at least one category.";
      };
      form.addEventListener("input", updateEst);
      updateEst();
      form.querySelector("#allcats").addEventListener("click", (e) => {
        const boxes = [...form.querySelectorAll("input[name=cat]")];
        const all = boxes.every((i) => i.checked);
        boxes.forEach((i) => (i.checked = !all));
        e.target.textContent = all ? "Pick all" : "Clear all";
        updateEst();
      });
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const cats = [...form.querySelectorAll("input[name=cat]:checked")].map((i) => i.value);
        if (!cats.length) return toast("Pick at least one category");
        const btn = form.querySelector("button");
        btn.disabled = true;
        try {
          await api("/runs", { method: "POST", json: { categories: cats, cap: Number(form.cap.value), wider: form.wider.checked, badSites: form.badSites.checked } });
          toast("Run started. Sites will appear below as they're built.");
          refreshHome();
        } catch (err) {
          toast(err.message);
        } finally {
          btn.disabled = false;
        }
      });
      }
      $app.querySelectorAll("[data-sales]").forEach((b) =>
        b.addEventListener("click", () => {
          filters.sales = b.dataset.sales;
          $app.querySelectorAll("[data-sales]").forEach((x) => x.classList.toggle("is-on", x === b));
          refreshHome();
        }),
      );
      $app.querySelector("#catfilter").addEventListener("change", (e) => {
        filters.category = e.target.value;
        refreshHome();
      });
    }
    await pushAsk();
    await refreshHome();
  }

  /** "👤 Ask for: Maria · mornings" when the lead has a contact person or best time on file. */
  function contactLine(l) {
    const bits = [l.contact ? `Ask for: <strong>${esc(l.contact)}</strong>` : "", l.bestTime ? esc(l.bestTime) : ""].filter(Boolean);
    return bits.length ? `👤 ${bits.join(" · ")}` : "";
  }

  // How many calls this person logged today, counted on this phone (the server has no per-day count yet).
  const loggedKey = () => `wb_logged_${(meta && meta.me && meta.me.id) || "owner"}_${dayFromNow(0)}`;
  const loggedToday = () => { try { return Number(localStorage.getItem(loggedKey()) || 0); } catch (e) { return 0; } };
  const bumpLogged = () => { try { localStorage.setItem(loggedKey(), String(loggedToday() + 1)); } catch (e) { /* storage blocked */ } };

  /** Today's call list: callbacks due, then prospects who just opened their preview, then the best untouched new leads. */
  function todayHtml(due, opened, fresh) {
    const weekAgo = Date.now() - 7 * 86400000;
    const rows = [];
    const seen = new Set();
    const add = (l, why, cls) => { if (seen.has(l.id) || rows.length >= 15) return; seen.add(l.id); rows.push({ l, why, cls }); };
    due.forEach((l) => add(l, l.followUp < dayFromNow(0) ? "Overdue" : "Callback", "chip--warn"));
    opened.filter((l) => l.salesStatus !== "sold" && l.salesStatus !== "live" && l.previewOpenedAt > weekAgo).forEach((l) => add(l, `Opened preview${l.previewOpens > 1 ? ` ${l.previewOpens}×` : ""} · ${ago(l.previewOpenedAt)}`, "chip--good"));
    fresh.filter((l) => l.status === "ready" && l.salesStatus === "new" && (!l.lastContact || l.lastContact < weekAgo)).sort((a, b) => (b.score || 0) - (a.score || 0)).forEach((l) => add(l, "New", ""));
    const goal = Number(meta.settings.dailyCalls) || 0;
    const done = loggedToday();
    const head = `Today: ${rows.length} call${rows.length === 1 ? "" : "s"}${done ? ` · you've logged ${done} so far today` : ""}`;
    if (!rows.length && !goal) return "";
    return `<section class="card due today"><h2>📋 ${esc(head)}</h2>
      ${goal ? `<div class="goal" role="progressbar" aria-valuenow="${Math.min(done, goal)}" aria-valuemin="0" aria-valuemax="${goal}" aria-label="Calls logged today"><i style="width:${Math.min(100, Math.round((done / goal) * 100))}%"></i></div><p class="small muted" style="margin:0 0 6px">${done >= goal ? `Goal of ${goal} reached 🎉` : `${goal - done} more to reach today's goal of ${goal}`}</p>` : ""}
      ${rows.length ? `<ul class="list">${rows.map(({ l, why, cls }) => `<li><div class="row"><a href="#/lead/${l.id}"><strong>${esc(l.name)}</strong></a><span class="chip why ${cls}">${esc(why)}</span></div>
        ${contactLine(l) ? `<p class="small muted" style="margin:2px 0 0">${contactLine(l)}</p>` : ""}
        <div class="btns" style="margin-top:6px">${l.status === "ready" ? `<a class="btn btn--small btn--primary" href="#/pitch/${l.id}">📞 Call guide</a><a class="btn btn--small" href="#/walkin/${l.id}">🚶 In-person</a>` : `<a class="btn btn--small btn--primary" href="${telHref(l.phone)}">📞 Call</a>`}</div></li>`).join("")}</ul>`
        : `<p class="small muted">Nothing due. Pick a New lead below and make a call.</p>`}</section>`;
  }

  /** Sold leads whose sign-up isn't paid yet: call them, or send the sign-up link again. */
  function unpaidHtml(sold) {
    const rows = sold.filter((l) => l.unpaidSignup);
    if (!rows.length) return "";
    return `<section class="card due"><h2>✍️ Signed, payment not finished (${rows.length})</h2><p class="small muted">They signed the agreement but didn't finish paying. A quick call usually sorts it out.</p>
      <ul class="list">${rows.map((l) => `<li><div class="row"><a href="#/lead/${l.id}"><strong>${esc(l.name)}</strong></a></div>
        <div class="btns" style="margin-top:6px"><a class="btn btn--small btn--primary" href="${telHref(l.phone)}">📞 Call</a><button class="btn btn--small" type="button" data-resend="${l.id}">Send sign-up link again</button></div></li>`).join("")}</ul></section>`;
  }

  async function resendSignup(id, btn) {
    btn.disabled = true;
    try {
      const l = await api("/leads/" + id);
      const last = (l.signups || [])[0];
      if (!last) { go("#/lead/" + id); return; }
      const res = await api(`/leads/${id}/signup`, { method: "POST", json: { plan: last.plan.id || "plus" } });
      const name = l.record ? l.record.name : l.name;
      location.href = `sms:+1${phoneDigits(l)}?body=${encodeURIComponent(`${greeting()} Here's the sign-up link again for the ${name} website (${res.plan} plan), in case the payment step didn't go through: ${res.url}`)}`;
    } catch (err) { toast(err.message); } finally { btn.disabled = false; }
  }

  /** Asks once on the home screen to turn on phone notifications, until done or dismissed. */
  async function pushAsk() {
    const el = document.getElementById("pushask");
    if (!el) return;
    let dismissed = false;
    try { dismissed = localStorage.getItem("wb_push_ask") === "no"; } catch (e) { /* storage blocked */ }
    const ps = await pushState().catch(() => ({ supported: false }));
    if (!document.getElementById("pushask")) return;
    if (dismissed || !ps.supported || ps.permission === "denied" || (ps.permission === "granted" && ps.sub)) { el.innerHTML = ""; return; }
    el.innerHTML = `<section class="card due"><h2>🔔 Turn on phone alerts?</h2><p class="small muted">${isOwner() ? "Get a notification when a prospect opens their preview, or a teammate logs a call, makes a sale or gets a sign-up." : "Get a notification when a prospect opens the preview link you sent, so you can call while it's fresh."}</p>
      <div class="btns"><button class="btn btn--primary btn--small" id="pask-on">Turn on</button><button class="btn btn--small" id="pask-no">Not now</button></div></section>`;
    el.querySelector("#pask-on").addEventListener("click", async (e) => {
      e.target.disabled = true;
      try { await turnOnPush(); toast("Phone alerts are on"); el.innerHTML = ""; } catch (err) { toast(err.message); e.target.disabled = false; }
    });
    el.querySelector("#pask-no").addEventListener("click", () => {
      try { localStorage.setItem("wb_push_ask", "no"); } catch (e) { /* storage blocked */ }
      el.innerHTML = "";
      toast("You can turn them on any time from 🔔");
    });
  }

  async function refreshHome() {
    stopPolling();
    if (!location.hash.match(/^#?\/?$/)) return;
    const my = renderSeq;
    const q = new URLSearchParams();
    if (filters.sales === "callbacks") q.set("callbacks", "all");
    else if (filters.sales) q.set("sales", filters.sales);
    if (filters.category) q.set("category", filters.category);
    const leadsEl0 = document.getElementById("leads");
    try {
      const [{ runs }, { leads }, { leads: due }, { leads: opened }, { leads: fresh }, { leads: sold }] = await Promise.all([
        isOwner() ? api("/runs") : Promise.resolve({ runs: [] }),
        api("/leads?" + q),
        api("/leads?callbacks=due"),
        api("/leads?opened=recent"),
        filters.sales === "new" && !filters.category ? Promise.resolve({ leads: null }) : api("/leads?sales=new"),
        api("/leads?sales=sold"),
      ]);
      if (stale(my)) return;
      const runsEl = document.getElementById("runs");
      const leadsEl = document.getElementById("leads");
      if (!runsEl || !leadsEl) return;
      runsEl.innerHTML = runsHtml(runs);
      const todayEl = document.getElementById("today");
      if (todayEl) todayEl.innerHTML = todayHtml(due, opened, fresh || leads);
      const unpaidEl = document.getElementById("unpaid");
      if (unpaidEl) {
        unpaidEl.innerHTML = unpaidHtml(sold);
        unpaidEl.querySelectorAll("[data-resend]").forEach((b) => b.addEventListener("click", () => resendSignup(b.dataset.resend, b)));
      }
      const empty = {
        new: isOwner() ? "No new leads yet. Pick a category and tap Run." : "No new leads right now. Check back after the next run.",
        callbacks: "No callbacks scheduled. Use “Call back…” after a call to schedule one.",
      };
      leadsEl.innerHTML = leads.length ? leads.map(leadCard).join("") : `<li class="card muted">${empty[filters.sales] || "Nothing here yet."}</li>`;
      const busy = runs.some((r) => !r.done) || leads.some((l) => l.status === "queued" || l.status === "building");
      if (busy) pollTimer = setTimeout(refreshHome, 5000);
    } catch (err) {
      if (stale(my) || err.status === 401) return;
      if (leadsEl0) {
        leadsEl0.innerHTML = `<li class="card offline"><p>${esc(err.message)}</p><button class="btn btn--primary" type="button" id="retryhome">Try again</button></li>`;
        leadsEl0.querySelector("#retryhome").addEventListener("click", () => { leadsEl0.innerHTML = `<li class="muted">Loading…</li>`; refreshHome(); });
      } else toast(err.message);
    }
  }

  /* ---------- call log ---------- */
  // limit: a short read-only list (call guide). collapse: the full list with the rest behind "Show all N".
  function notesHtml(l, limit, collapse) {
    const notes = limit ? l.notes.slice(0, limit) : l.notes;
    if (!notes.length) return `<p class="muted small">No calls logged yet.</p>`;
    const me = meta.me || {};
    const hidden = collapse && notes.length > 3 ? notes.length - 3 : 0;
    return `<ul class="list notes">${notes
      .map((n, i) => `<li${hidden && i >= 3 ? " hidden" : ""}><div class="row"><strong>${esc(n.outcome ? OUTCOME_LABEL[n.outcome] || n.outcome : "📝 Note")}</strong>
        ${!limit && (isOwner() || n.author === me.name) ? `<button class="linkbtn" data-delnote="${n.id}" aria-label="Delete note">Delete</button>` : ""}</div>
        ${n.body ? `<p>${esc(n.body)}</p>` : ""}<p class="small muted">${esc(n.author)} · ${ago(n.createdAt)}</p></li>`)
      .join("")}</ul>${hidden ? `<button class="linkbtn" type="button" data-act="allnotes">Show all ${notes.length}</button>` : ""}`;
  }

  function logCardHtml(l) {
    const current = l.followUp && l.followUp >= dayFromNow(0) ? l.followUp : "";
    return `<section class="card" id="logcard"><h2>Log this call</h2>
      <label class="field">Notes<textarea name="note" rows="3" maxlength="2000" placeholder="Who you talked to, what they said, best time to call…"></textarea></label>
      <div class="field"><span>Call back on <span class="hint">${current ? "Now set for " + esc(dayLabel(current)) : "Not set"}</span></span>
        <div class="chips">${[[1, "Tomorrow"], [3, "In 3 days"], [7, "Next week"]].map(([n, t]) => `<button type="button" class="pick" data-days="${n}">${t}</button>`).join("")}</div>
        <input type="date" name="follow" min="${dayFromNow(0)}" value="${current}"></div>
      <p style="margin:0 0 6px"><strong>How did it go?</strong> <span class="small muted">Tap one to save.</span></p>
      <div class="btns btns--full" id="outcomes">
        <button class="btn" type="button" data-out="no_answer">📵 No answer</button>
        <button class="btn" type="button" data-out="reached">📞 Reached</button>
        <button class="btn" type="button" data-out="shown">👍 Interested (shown)</button>
        <button class="btn" type="button" data-out="callback">📅 Call back</button>
        <button class="btn btn--good" type="button" data-out="sold">🎉 Sold</button>
        <button class="btn" type="button" data-out="not_interested">✋ Not interested</button>
      </div>
      <div id="lostwhy" hidden style="margin-top:10px"><p style="margin:0 0 6px"><strong>Why not?</strong> <span class="small muted">Tap one to save.</span></p>
        <div class="chips">${LOST_REASONS.map(([k, t]) => `<button type="button" class="pick" data-why="${k}">${t}</button>`).join("")}<button type="button" class="linkbtn" data-why-cancel>Cancel</button></div></div>
      <p style="margin:10px 0 0"><button class="linkbtn" type="button" data-out="note">Just save a note</button></p>
      <p class="small muted" style="margin-top:6px">No answer schedules a callback for tomorrow unless you pick a day. Sold and Not interested clear the callback. If they ask not to be called again, tap Not interested.</p></section>`;
  }

  function bindLog(l, after) {
    const card = document.getElementById("logcard");
    if (!card) return;
    const date = card.querySelector("[name=follow]");
    let dirty = false;
    date.addEventListener("input", () => { dirty = true; });
    card.querySelectorAll("[data-days]").forEach((b) => b.addEventListener("click", () => {
      date.value = dayFromNow(Number(b.dataset.days));
      dirty = true;
      card.querySelectorAll("[data-days]").forEach((x) => x.classList.toggle("is-on", x === b));
    }));
    const lost = card.querySelector("#lostwhy");
    const save = async (b, outcome, reason) => {
      let note = card.querySelector("[name=note]").value.trim();
      const picked = date.value || null;
      if (outcome === "callback" && !picked) return toast("Pick a day to call back");
      if (outcome === "note" && !note) return toast("Write a note first");
      if (reason) note = `Reason: ${reason}. ${note}`.trim();
      const payload = { outcome, note };
      if (dirty || outcome === "callback") payload.followUp = picked;
      b.disabled = true;
      try {
        const res = await api(`/leads/${l.id}/log`, { method: "POST", json: payload });
        if (outcome !== "note") bumpLogged();
        toast(res.nextStep ? `Saved. Next: ${res.nextStep}` : outcome === "sold" ? "Nice! Marked as sold." : res.followUp ? `Saved. Call back ${dayLabel(res.followUp)}.` : "Saved");
        after();
      } catch (err) { toast(err.message); } finally { b.disabled = false; }
    };
    card.querySelectorAll("[data-out]").forEach((b) => b.addEventListener("click", () => {
      if (b.dataset.out === "not_interested") {
        // Ask why first; the reason chip saves.
        lost.hidden = false;
        lost.querySelector("[data-why]").focus();
        return;
      }
      lost.hidden = true;
      save(b, b.dataset.out);
    }));
    card.querySelectorAll("[data-why]").forEach((b) => b.addEventListener("click", () => save(b, "not_interested", b.dataset.why)));
    const cancel = card.querySelector("[data-why-cancel]");
    if (cancel) cancel.addEventListener("click", () => { lost.hidden = true; });
  }

  function bindNotes(l, after) {
    $app.querySelectorAll("[data-delnote]").forEach((b) => b.addEventListener("click", async () => {
      if (!confirm("Delete this note?")) return;
      try { await api(`/leads/${l.id}/notes/${b.dataset.delnote}`, { method: "DELETE" }); after(); } catch (err) { toast(err.message); }
    }));
    const all = $app.querySelector("[data-act=allnotes]");
    if (all) all.addEventListener("click", () => { $app.querySelectorAll(".notes li[hidden]").forEach((li) => (li.hidden = false)); all.remove(); });
    const clear = $app.querySelector("[data-act=clearfollow]");
    if (clear) clear.addEventListener("click", async () => {
      try { await api(`/leads/${l.id}/followup`, { method: "PUT", json: { date: null } }); toast("Callback cleared"); after(); } catch (err) { toast(err.message); }
    });
  }

  /* ---------- sign-up ---------- */
  function signupCardHtml(l) {
    const plans = meta.settings.plans || [];
    const signed = (l.signups || [])[0];
    return `<section class="card" id="signupcard"><h2>${signed ? "Signed up" : "Sign them up"}</h2>
      ${(l.signups || []).map((x) => `<div class="signed"><strong>✍️ ${esc(x.plan.name)}${x.plan.billingLabel ? ` · ${esc(x.plan.billingLabel)}` : ""}</strong>
        <p class="small">${esc(x.plan.billingDetail || `${money(x.plan.monthly)}/month${x.plan.setup ? ` + ${money(x.plan.setup)} setup` : ""}`)}</p>
        ${x.extras && (x.extras.extras.length || x.extras.quotes.length) ? `<p class="small">Extras: ${esc([...x.extras.extras.map((e) => (e.qty > 1 ? `${e.name} ×${e.qty}` : e.name)), ...x.extras.quotes.map((q) => `${q} (quote)`)].join(", "))}</p>` : ""}
        ${x.dueCents ? `<p class="small">Due at sign-up: <strong>${money(x.dueCents / 100)}</strong></p>` : ""}
        <p class="small"><a href="/api/agreements/s/${x.id}" target="_blank" rel="noopener">📄 Signed agreement</a></p>
        <p class="small muted">${esc(x.signerName)}${x.signerTitle ? ", " + esc(x.signerTitle) : ""} · ${esc(x.signerEmail || "")} · ${ago(x.createdAt)}${x.sentBy ? ` · sent by ${esc(x.sentBy)}` : ""}</p>
        ${isOwner() ? `<label class="check"><input type="checkbox" data-paid="${x.id}"${x.paid ? " checked" : ""}> Payment is set up</label>` : x.paid ? `<p class="chip chip--good">Paid</p>` : ""}</div>`).join("")}
      ${(l.purchases || []).length ? `<h3 style="margin-top:12px">Extras bought later</h3><ul class="list small">${l.purchases.map((p) => `<li>${esc([...p.extras.map((e) => (e.qty > 1 ? `${e.name} ×${e.qty}` : e.name)), ...p.quotes.map((q) => `${q} (quote)`)].join(", "))} · ${money(p.dueCents / 100)} · ${p.paid ? "✅ paid" : "not paid yet"} · ${ago(p.createdAt)} · <a href="/api/agreements/p/${p.id}" target="_blank" rel="noopener">📄 agreement</a></li>`).join("")}</ul>` : ""}
      ${plans.length
        ? `<p class="small muted">${signed ? "Send a new link to change plans." : "Pick a plan. They choose how to pay (yearly, month to month or the standard term), sign with their name and set up automatic payment, on your phone or theirs."}</p>
          <p><a class="btn btn--small" href="#/plans/${l.id}">📋 Show them the plans</a></p>
          <div class="btns btns--full">${plans.map((p) => `<button class="btn${p.id === "plus" ? " btn--primary" : ""}" data-plan="${p.id}">${esc(p.name)} · ${money(p.monthly)}/mo</button>`).join("")}</div>
          <div id="signuplink"></div>`
        : isOwner() ? `<p class="small muted">Add your plans and prices in <a href="#/settings">Settings</a> first.</p>` : `<p class="small muted">The owner hasn't set up plans yet.</p>`}
      </section>`;
  }

  function bindSignup(l, after) {
    const card = document.getElementById("signupcard");
    if (!card) return;
    card.querySelectorAll("[data-paid]").forEach((c) => c.addEventListener("change", async () => {
      try { await api(`/leads/${l.id}/paid`, { method: "POST", json: { signupId: c.dataset.paid, paid: c.checked } }); toast(c.checked ? "Marked as paid" : "Marked as not paid"); } catch (err) { toast(err.message); }
    }));
    card.querySelectorAll("[data-plan]").forEach((b) => b.addEventListener("click", async () => {
      b.disabled = true;
      try {
        const res = await api(`/leads/${l.id}/signup`, { method: "POST", json: { plan: b.dataset.plan } });
        const phone = phoneDigits(l);
        const sms = `${greeting()} Here's the sign-up page for your new website (${res.plan} plan) for ${l.record ? l.record.name : l.name}: ${res.url}`;
        card.querySelector("#signuplink").innerHTML = `<div class="linkbox"><p class="small"><strong>${esc(res.plan)}</strong> sign-up link ready (works ${res.expiresInDays} days).</p>
          <div class="btns btns--full"><a class="btn btn--primary" href="${esc(res.url)}" target="_blank" rel="noopener">Open here</a>
          <a class="btn" href="sms:+1${phone}?body=${encodeURIComponent(sms)}">Text it</a><button class="btn" type="button" data-copy>Copy</button></div>
          <p class="small muted">“Open here” lets them sign on your phone right now.</p></div>`;
        card.querySelector("[data-copy]").addEventListener("click", async () => { try { await navigator.clipboard.writeText(res.url); toast("Link copied"); } catch (e) { toast("Couldn't copy"); } });
      } catch (err) { toast(err.message); } finally { b.disabled = false; }
    }));
  }

  /* ---------- live client tools ---------- */
  function liveCardHtml(l) {
    return `<section class="card" id="livecard"><h2>Client site</h2>
      <div id="stats"><p class="muted small"><span class="spin"></span> Loading visits…</p></div>
      <div class="btns btns--full" style="margin-top:10px">
        <button class="btn" id="report">Text monthly report</button>
        ${noReviews(l) ? "" : `<a class="btn" href="/api/leads/${l.id}/reviewcard" target="_blank" rel="noopener">Review cards (QR)</a>`}
        <a class="btn" href="/api/leads/${l.id}/tents" target="_blank" rel="noopener">QR table tents</a>
        <a class="btn" href="/api/leads/${l.id}/window" target="_blank" rel="noopener">Window sign (QR)</a></div>
      <h3 style="margin-top:16px">Their own domain</h3>
      <div id="domain"><p class="muted small">Checking…</p></div></section>`;
  }

  async function bindLive(l) {
    const statsEl = document.getElementById("stats");
    if (!statsEl) return;
    let st;
    try {
      st = await api(`/leads/${l.id}/stats`);
      const row = (label, t) => `<tr><th scope="row">${label}</th><td>${t.views}</td><td>${t.calls}</td><td>${t.directions}</td><td>${t.requests}</td></tr>`;
      const monthName = (ym) => new Date(ym + "-15").toLocaleDateString(undefined, { month: "long" });
      statsEl.innerHTML = `<table class="stats"><thead><tr><th></th><th>Visits</th><th>Calls</th><th>Directions</th><th>Requests</th></tr></thead><tbody>
        ${row(esc(monthName(st.thisMonth.label)) + " so far", st.thisMonth)}${row(esc(monthName(st.lastMonth.label)), st.lastMonth)}</tbody></table>
        <p class="small muted">Calls and directions are taps on those buttons. Counted without cookies.</p>`;
    } catch (err) { statsEl.innerHTML = `<p class="small muted">${esc(err.message)}</p>`; }
    document.getElementById("report").addEventListener("click", () => {
      if (!st) return;
      const t = st.lastMonth.views || !st.thisMonth.views ? st.lastMonth : st.thisMonth;
      const label = new Date((t === st.lastMonth ? st.lastMonth.label : st.thisMonth.label) + "-15").toLocaleDateString(undefined, { month: "long" });
      const name = l.record ? l.record.name : l.name;
      const from = meta.settings.companyName ? ` from ${meta.settings.companyName}` : "";
      const msg = `Hi! Your website report for ${name}, ${label}${from}: ${t.views} visits, ${t.calls} people tapped Call, ${t.directions} got directions${t.requests ? `, and ${t.requests} sent a request through the site` : ""}. Let us know if you'd like anything updated!`;
      location.href = `sms:+1${phoneDigits(l)}?body=${encodeURIComponent(msg)}`;
    });
    const domEl = document.getElementById("domain");
    const renderDomain = (d) => {
      const steps = d && d.domain
        ? `<p><strong>${esc(d.domain)}</strong> ${d.status === "active" ? '<span class="chip chip--good">● Working</span>' : `<span class="chip chip--warn">${esc(d.status || "waiting")}</span>`}</p>
          ${d.status === "active" ? "" : `<p class="small">At the company where the domain was bought (GoDaddy, Namecheap…), add this DNS record:</p>
          <p class="small"><code>CNAME</code> · name <code>${esc(d.domain.split(".").length > 2 ? d.domain.split(".")[0] : "@")}</code> · value <code>${esc(d.target)}</code></p>
          <p class="small muted">${d.domain.split(".").length > 2 ? "" : "A bare domain (no www) works best if the domain uses Cloudflare's nameservers. Using www.yourdomain.com is easiest. "}It can take a few hours. HTTPS is set up automatically.${d.error ? " Last check: " + esc(d.error) : ""}</p>`}
          <div class="btns"><button class="btn btn--small" data-dom="check">Check again</button><button class="btn btn--small btn--danger" data-dom="remove">Remove</button></div>`
        : `<form id="domf" class="row"><label class="field" style="margin:0"><span class="sr-only">Domain</span><input name="domain" placeholder="www.theirbusiness.com" autocapitalize="off" autocomplete="off" inputmode="url"></label><button class="btn" style="flex:none">Add</button></form>
          <p class="small muted">They buy the domain (about $10–15 a year, at Cloudflare, GoDaddy or Namecheap), then add it here.</p>`;
      domEl.innerHTML = steps;
      const f = domEl.querySelector("#domf");
      if (f) f.addEventListener("submit", async (e) => {
        e.preventDefault();
        try { renderDomain(await api(`/leads/${l.id}/domain`, { method: "PUT", json: { domain: f.domain.value.trim() } })); } catch (err) { toast(err.message); }
      });
      domEl.querySelectorAll("[data-dom]").forEach((b) => b.addEventListener("click", async () => {
        try {
          if (b.dataset.dom === "remove") { if (!confirm("Remove this domain from the site?")) return; await api(`/leads/${l.id}/domain`, { method: "DELETE" }); renderDomain(null); }
          else renderDomain(await api(`/leads/${l.id}/domain`));
        } catch (err) { toast(err.message); }
      }));
    };
    try { renderDomain(await api(`/leads/${l.id}/domain`)); } catch (err) { domEl.innerHTML = `<p class="small muted">${esc(err.message)}</p>`; }
  }

  /* ---------- lead detail ---------- */
  /** Stripe billing portal for a sold/live client. The route redirects to Stripe; peek first so a missing customer shows a message, not a JSON page. */
  async function openPortal(id) {
    let res;
    try { res = await fetch(`/api/leads/${id}/portal`, { headers: { "x-wb": "1" }, credentials: "same-origin", redirect: "manual" }); } catch (e) { throw new Error(NO_CONNECTION); }
    if (res.type === "opaqueredirect" || res.ok || res.status === 0) { location.href = `/api/leads/${id}/portal`; return; }
    let data = {}; try { data = await res.json(); } catch (e) { /* empty */ }
    throw new Error(res.status === 404 ? "The billing portal isn't available yet." : data.error || "No Stripe customer on file for this client yet.");
  }

  /** The cadence's next step as one button: Call guide / Follow-up text / In-person guide / Last check-in / Not interested. */
  function cadenceAction(l, next) {
    const t = String(next || "").toLowerCase();
    if (/not interested|close|give up|let .*go/.test(t)) return `<button class="btn btn--small" type="button" data-act="lost">✋ Not interested</button>`;
    if (/last check/.test(t)) return `<button class="btn btn--small" type="button" data-follow="2">👋 Last check-in text</button>`;
    if (/in person|visit|walk|stop by|drop by/.test(t)) return `<a class="btn btn--small" href="#/walkin/${l.id}">🚶 In-person guide</a>`;
    if (/text|follow/.test(t)) return `<button class="btn btn--small" type="button" data-follow="0">💬 Follow-up text</button>`;
    return `<a class="btn btn--small" href="#/pitch/${l.id}">📞 Call guide</a>`;
  }

  /** "👤 Ask for: Maria · mornings" with an inline edit (saved with PUT /contact). */
  function contactHtml(l, editing) {
    if (editing) return `<form class="ask" id="askform"><label class="field">Ask for <input name="contact" maxlength="80" value="${esc(l.contact || "")}" placeholder="Owner's name"></label>
      <label class="field">Best time <input name="bestTime" maxlength="80" value="${esc(l.bestTime || "")}" placeholder="e.g. weekday mornings"></label>
      <button class="btn btn--small btn--primary" type="submit">Save</button><button class="btn btn--small" type="button" data-act="askcancel">Cancel</button></form>`;
    return `<p class="ask">${contactLine(l) || `<span class="muted">👤 Who should you ask for?</span>`} <button class="linkbtn" type="button" data-act="askedit">${l.contact || l.bestTime ? "Edit" : "Add"}</button></p>`;
  }

  function bindContact(l) {
    const box = document.getElementById("askbox");
    if (!box) return;
    const draw = (editing) => {
      box.innerHTML = contactHtml(l, editing);
      const edit = box.querySelector("[data-act=askedit]");
      if (edit) edit.addEventListener("click", () => { draw(true); box.querySelector("[name=contact]").focus(); });
      const cancel = box.querySelector("[data-act=askcancel]");
      if (cancel) cancel.addEventListener("click", () => draw(false));
      const f = box.querySelector("#askform");
      if (f) f.addEventListener("submit", async (e) => {
        e.preventDefault();
        const json = { contact: f.contact.value.trim(), bestTime: f.bestTime.value.trim() };
        try {
          const res = await api(`/leads/${l.id}/contact`, { method: "PUT", json });
          Object.assign(l, { contact: res.contact ?? json.contact, bestTime: res.bestTime ?? json.bestTime });
          toast("Saved");
          draw(false);
        } catch (err) { toast(err.status === 404 ? "Saving a contact isn't available yet. Put it in a note for now." : err.message); }
      });
    };
    draw(false);
  }

  async function viewLead(id) {
    setNav("home");
    const my = renderSeq;
    const l = await api("/leads/" + id);
    if (stale(my)) return;
    const r = l.record;
    const lint = l.lint || { publishBlockers: [], errors: [], warnings: [], todos: [], suggestions: [] };
    const blockers = [...lint.errors, ...lint.publishBlockers];
    const ready = l.status === "ready";
    const lookName = [(l.looks.find((x) => x.id === l.lookBase) || {}).name, ((l.layouts || []).find((x) => x.id === l.layout) || {}).name].filter(Boolean).join(" · ");
    const owner = isOwner();
    const open = l.salesStatus === "new" || l.salesStatus === "shown";
    $app.innerHTML = `<p><a href="#/">← Leads</a></p>
      <div class="split"><div>
      <section class="card">
        <h1>${esc(r ? r.name : l.name)}</h1>
        <p class="muted">${esc(l.variantLabel || CATEGORY_LABEL[l.category] || "")} · ${esc(l.reason || "")}</p>
        ${l.rating ? `<p><span class="stars">★ ${l.rating.toFixed(1)}</span> on Google</p>` : ""}
        <p>${esc(l.address || "")}</p>
        <div id="askbox"></div>
        <div class="btns btns--full">
          ${ready ? `<a class="btn btn--primary" href="#/pitch/${l.id}">📞 Call guide</a>` : ""}
          ${ready && open ? `<a class="btn btn--primary" href="#/walkin/${l.id}">🚶 In-person guide</a>` : ""}
          <a class="btn${ready ? "" : " btn--primary"}" href="${telHref(phoneDigits(l))}">📞 Call ${esc(r ? r.phone.display : l.phone)}</a>
          ${r ? `<a class="btn" href="${esc(r.mapsUrl)}" target="_blank" rel="noopener">Google listing</a>` : ""}
          ${open ? `<a class="btn" href="#/playbook">💬 Plans & answers</a>` : ""}
        </div>
      </section>
      <div id="logslot-top"></div>
      <section class="card"><h2>Sales status</h2>
        ${l.salesStatus === "live"
          ? `<p class="chip chip--good">● Live</p>`
          : owner ? `<div class="tabs">${[["new", "New"], ["shown", "Shown"], ["sold", "Sold"], ["not_interested", "Not interested"]].map(([k, t]) => `<button type="button" data-status="${k}" class="${l.salesStatus === k ? "is-on" : ""}">${t}</button>`).join("")}</div>`
          : `<p class="chip${l.salesStatus === "sold" ? " chip--good" : ""}">${esc({ new: "New", shown: "Shown", sold: "Sold", not_interested: "Not interested" }[l.salesStatus] || l.salesStatus)}</p><p class="small muted" style="margin:6px 0 0">Log the call below to update it.</p>`}
        ${l.cadence && open && ready ? `<div class="cadence"><p><strong>Day ${Number(l.cadence.day)} since shown</strong> · Next: ${esc(l.cadence.next || "")}</p><div class="btns">${cadenceAction(l, l.cadence.next)}</div></div>` : ""}
      </section>
      <section class="card"><h2>Website</h2>
        ${l.status === "failed" ? `<p class="chip chip--bad">Build failed</p><p class="small muted">${esc(l.error || "")}</p>${owner ? `<button class="btn" data-act="retry">Try again</button>` : `<p class="small muted">The owner can rebuild it.</p>`}` : ""}
        ${l.status === "queued" || l.status === "building" ? `<p><span class="spin"></span> Building… this takes about a minute.</p>` : ""}
        ${ready ? `<p class="muted small">Design: ${esc(lookName)}${owner && l.salesStatus !== "live" ? ` <button class="btn btn--small" type="button" data-act="restyle">🎨 Try another design</button>` : ""}</p>
          <div class="btns btns--full">
            <a class="btn btn--primary" href="#/preview/${l.id}">Preview</a>
            <a class="btn" href="#/full/${l.id}">Open full screen</a>
            ${owner ? `<a class="btn" href="#/edit/${l.id}">Edit</a>` : ""}
            ${l.salesStatus !== "live" ? `<button class="btn" type="button" data-flyer="${l.id}">Leave-behind flyer (QR)</button>` : ""}
          </div>
          ${l.salesStatus !== "live" ? `<div style="margin-top:10px">${shareButtonsHtml()}</div>` : ""}
          ${l.previewOpens ? `<p class="small" style="margin-top:8px">👀 They opened their preview ${l.previewOpens === 1 ? "once" : `${l.previewOpens} times`}, last ${ago(l.previewOpenedAt)}.</p>` : ""}` : ""}
        ${l.liveUrl ? `<p style="margin-top:12px">Live at <a href="${esc(l.liveUrl)}" target="_blank" rel="noopener">${esc(l.liveUrl.replace("https://", ""))}</a></p>` : ""}
      </section>
      <section class="card"><h2>Calls &amp; notes</h2>
        ${l.followUp && open ? `<div class="row" style="margin-bottom:8px">${followChip(l.followUp)}<button class="linkbtn" data-act="clearfollow" style="flex:none">Clear</button></div>` : ""}
        ${notesHtml(l, 0, true)}
      </section>
      </div><div>
      ${ready ? signupCardHtml(l) : ""}
      ${l.salesStatus === "live" && owner ? liveCardHtml(l) : ""}
      ${(l.salesStatus === "live" || l.salesStatus === "sold") && owner && ready ? gbpCardHtml(l) : ""}
      ${l.salesStatus === "live" || l.salesStatus === "sold" ? `<section class="card"><h2>🛒 Extras</h2><p class="small muted">Text them a link to add extras (photo shoot, Spanish page, social posts…) and pay${meta.checkout && meta.checkout.online ? " online" : ""}. Good for 30 days.</p>
        <div class="btns btns--full"><button class="btn" type="button" data-extraslink>💬 Text “Buy extras” link</button></div></section>` : ""}
      ${l.salesStatus === "live" || l.salesStatus === "sold" ? reviewAskHtml() : ""}
      ${(l.salesStatus === "live" || l.salesStatus === "sold") && owner ? `<section class="card"><h2>💳 Billing</h2><p class="small muted">Their Stripe billing portal: update the card, see invoices, change or cancel the subscription.</p>
        <div class="btns btns--full"><button class="btn" type="button" data-act="portal">Open billing portal</button></div></section>` : ""}
      <div id="logslot-side">${l.salesStatus !== "live" ? logCardHtml(l) : ""}</div>
      ${ready && owner ? `<section class="card"><h2>${blockers.length ? "Before you can publish" : "Ready to publish"}</h2>
        ${blockers.length ? `<ul class="list small">${blockers.map((b) => `<li>${esc(b)}</li>`).join("")}</ul><p class="small muted">Fill these in from Edit.</p>` : `<p class="muted">Everything's confirmed. Publishing puts the site on the internet.</p>`}
        ${(lint.suggestions || []).length ? `<h3 style="margin-top:12px">Good to add (talking points)</h3><ul class="list small">${lint.suggestions.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
        <div class="btns btns--full">
          <button class="btn btn--good" data-act="publish"${blockers.length ? " disabled" : ""}>${l.liveUrl ? "Republish changes" : "Publish to Cloudflare"}</button>
          <button class="btn" data-act="zip"${blockers.length ? " disabled" : ""}>Download zip</button>
        </div></section>` : ""}
      ${owner ? `<section class="card"><h2>More</h2><div class="btns">
        ${ready ? `<button class="btn btn--small" data-act="rewrite">Rewrite text with AI</button>` : ""}
        ${l.salesStatus !== "live" ? `<button class="btn btn--small btn--danger" data-act="delete">Delete lead</button>` : ""}
      </div></section>` : ""}</div></div>`;
    const reload = () => viewLead(id);
    bindLog(l, reload);
    bindNotes(l, reload);
    bindSignup(l, reload);
    bindContact(l);
    bindFlyer();
    if (l.salesStatus === "live" && owner) bindLive(l);
    // Phones: the log card goes right under the header so a call can be logged without scrolling past everything.
    // Unfolded: it stays in the right column. Moving the node keeps anything already typed.
    if (viewLead.unplace) viewLead.unplace();
    const mql = matchMedia("(max-width: 759px)");
    const placeLog = () => {
      const card = document.getElementById("logcard");
      const slot = document.getElementById(mql.matches ? "logslot-top" : "logslot-side");
      if (card && slot && card.parentElement !== slot) slot.appendChild(card);
    };
    placeLog();
    mql.addEventListener("change", placeLog);
    viewLead.unplace = () => { mql.removeEventListener("change", placeLog); viewLead.unplace = null; };
    onLeave(() => viewLead.unplace && viewLead.unplace());

    const STATUS_ASK = { sold: "Mark this lead as Sold? (Normally you'd log the call instead.)", not_interested: "Mark as Not interested? They drop off the call lists.", new: "Move this lead back to New?" };
    $app.querySelectorAll("[data-status]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (b.dataset.status === l.salesStatus) return;
        if (STATUS_ASK[b.dataset.status] && !confirm(STATUS_ASK[b.dataset.status])) return;
        try {
          await api(`/leads/${id}/status`, { method: "POST", json: { salesStatus: b.dataset.status } });
          viewLead(id);
        } catch (err) { toast(err.message); }
      }),
    );
    const act = (name, fn) => {
      const el = $app.querySelector(`[data-act=${name}]`);
      if (el) el.addEventListener("click", async () => {
        el.disabled = true;
        const label = el.innerHTML;
        try { await fn(el); } catch (err) {
          toast(err.data && err.data.blockers ? "Not ready: " + err.data.blockers[0] : err.message);
        } finally { el.disabled = false; if (el.isConnected) el.innerHTML = label; }
      });
    };
    if (ready && l.salesStatus !== "live") bindShareButtons(l);
    bindReviewAsk(l);
    act("lost", async () => {
      const card = document.getElementById("logcard");
      if (!card) return;
      card.scrollIntoView({ behavior: "smooth", block: "start" });
      card.querySelector("[data-out=not_interested]").click();
    });
    act("portal", () => openPortal(id));
    act("restyle", async () => { await api(`/leads/${id}/restyle`, { method: "POST" }); toast("New design ready"); viewLead(id); });
    if (owner) act("retry", async () => { await api(`/leads/${id}/retry`, { method: "POST" }); toast("Rebuilding…"); setTimeout(() => viewLead(id), 1500); });
    act("rewrite", async () => {
      if (!confirm("Write new text with AI? Your text edits will be replaced. Facts, photos and menu stay.")) return;
      await api(`/leads/${id}/rewrite`, { method: "POST" });
      toast("Rewriting… check back in a minute.");
      setTimeout(() => viewLead(id), 1500);
    });
    act("delete", async () => {
      if (!confirm("Delete this lead and its preview site?")) return;
      await api(`/leads/${id}`, { method: "DELETE" });
      toast("Deleted");
      go("#/");
    });
    act("publish", async (el) => {
      if (!confirm(l.liveUrl ? "Publish your changes to the live site?" : "Put this site on the internet now?")) return;
      el.innerHTML = '<span class="spin"></span> Publishing…';
      const res = await api(`/leads/${id}/publish`, { method: "POST" });
      toast("Published! It can take a minute to appear.");
      window.open(res.url, "_blank", "noopener");
      viewLead(id);
    });
    act("zip", async () => {
      const res = await api(`/leads/${id}/zip`, { raw: true });
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = (r.name || "site").replace(/[^a-z0-9]+/gi, "-").toLowerCase() + ".zip";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    });
    if (l.status === "queued" || l.status === "building") pollTimer = setTimeout(() => location.hash === `#/lead/${id}` && viewLead(id), 5000);
  }

  // Flyer: POST marks the lead Shown (callers may), then the printable page opens in a new tab (GET has no side effects).
  // Older servers mark Shown on the GET itself, so a 404 on the POST is fine.
  function bindFlyer() {
    $app.querySelectorAll("[data-flyer]").forEach((b) => b.addEventListener("click", async () => {
      const id = b.dataset.flyer;
      const w = window.open("", "_blank");
      try { await api(`/leads/${id}/flyer`, { method: "POST" }); } catch (e) { /* not available yet, or no connection: the page still prints */ }
      const url = `/api/leads/${id}/flyer`;
      if (w) w.location.href = url; else window.open(url, "_blank", "noopener");
    }));
  }

  /* ---------- preview ---------- */
  // Full-screen preview inside the app (a new tab would leave the Android app, and Back would close it).
  function viewFull(id, sub) {
    document.body.classList.add("showing");
    $app.innerHTML = `<div class="fullview"><iframe title="Site preview" src="/p/${id}/${sub ? sub + "/" : ""}"></iframe>
      <button class="fullview__close" type="button" aria-label="Close full screen">✕</button></div>`;
    $app.querySelector(".fullview__close").addEventListener("click", () => {
      if (history.length > 1) history.back();
      else go("#/preview/" + id);
    });
  }

  async function viewPreview(id) {
    setNav("home");
    let mode = matchMedia("(min-width: 760px)").matches ? "desktop" : "phone";
    $app.innerHTML = `<p><a href="#/lead/${id}">← Details</a></p>
      <div class="row" style="margin-bottom:10px"><div class="tabs" style="margin:0">
        <button type="button" data-mode="phone">Phone view</button><button type="button" data-mode="desktop">Desktop view</button></div>
        <a class="btn btn--small" href="#/full/${id}" style="flex:none">Full screen</a></div>
      <div class="frame-wrap" id="fw"><iframe id="pf" title="Site preview" src="/p/${id}/"></iframe></div>
      <div id="previewshare" style="margin-top:12px"></div>`;
    const my = renderSeq;
    api("/leads/" + id).then((l) => {
      const box = document.getElementById("previewshare");
      if (stale(my) || !box || l.status !== "ready" || l.salesStatus === "live") return;
      box.innerHTML = shareButtonsHtml();
      bindShareButtons(l);
    }).catch(() => {});
    const fw = $app.querySelector("#fw");
    const frame = $app.querySelector("#pf");
    const layout = () => {
      fw.className = "frame-wrap frame-wrap--" + mode;
      $app.querySelectorAll("[data-mode]").forEach((b) => b.classList.toggle("is-on", b.dataset.mode === mode));
      if (mode === "desktop") {
        const scale = fw.clientWidth / 1280;
        frame.style.transform = `scale(${scale})`;
        frame.style.height = fw.clientHeight / scale + "px";
      } else {
        frame.style.transform = "";
        frame.style.height = "";
      }
    };
    $app.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => { mode = b.dataset.mode; layout(); }));
    addEventListener("resize", layout);
    onLeave(() => removeEventListener("resize", layout));
    layout();
  }

  /* ---------- edit ---------- */
  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 1600 / img.naturalWidth);
        const c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * scale);
        c.height = Math.round(img.naturalHeight * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        c.toBlob((b) => (b ? resolve({ blob: b, w: c.width, h: c.height }) : reject(new Error("Couldn't read that photo"))), "image/jpeg", 0.82);
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => reject(new Error("Couldn't read that photo"));
      img.src = URL.createObjectURL(file);
    });
  }

  // Edit-screen cards that other actions (photo upload, gallery, Spanish page) change: each is re-rendered on its own
  // from a fresh lead, so the rest of the form keeps whatever's been typed.
  function photoCardHtml(r) {
    return `<section class="card" id="card-photo"><h2>Photo</h2>
        <p class="small muted">${r.media.hero && r.media.hero.source === "google" ? "Using a Google photo (fine for the preview, but it must be replaced before publishing)." : r.media.hero ? "Using the owner's photo." : "No photo yet."}</p>
        <label class="field">Main photo<input type="file" id="photo" accept="image/*"></label>
        <label class="field">Describe the photo<input id="photoAlt" placeholder="e.g. Freshly mowed front lawn in Cullman"></label>
        <button class="btn btn--small" type="button" data-eact="upload">Upload photo</button>
      </section>`;
  }
  function galleryCardHtml(id, r) {
    return `<section class="card" id="card-gallery"><h2>Photo gallery</h2>
        <p class="small muted">Up to 12 of the owner's own photos (the photo shoot extra): their place, their work, their team. They show as a photo grid on the site.</p>
        ${r.media.gallery.length ? `<ul class="thumbs">${r.media.gallery.map((p) => `<li><img src="/p/${id}${esc(p.src)}" alt="${esc(p.alt)}" loading="lazy"><button class="linkbtn" type="button" data-eact="delphoto" data-photo="${esc(p.src.split("/").pop().split(".")[0])}">Remove</button></li>`).join("")}</ul>` : ""}
        <label class="field">Add photos<input type="file" id="gallery" accept="image/*" multiple></label>
        <label class="field">Describe them <span class="hint">Used for every photo in this batch</span><input id="galleryAlt" placeholder="e.g. Fresh fade at the shop"></label>
        <button class="btn btn--small" type="button" data-eact="gupload">Add to gallery</button>
      </section>`;
  }
  function esCardHtml(id, c) {
    return `<section class="card" id="card-es"><h2>Spanish page</h2>
        <p class="small muted">${c.es ? "This site has a Spanish page at /es/, linked as “Español” in the menu. Rewrite it after big text changes." : "Optional extra. AI translates the site's text into a Spanish page with Spanish buttons and hours (about 20 seconds)."}</p>
        <div class="btns"><button class="btn btn--small" type="button" data-eact="es-write">${c.es ? "Rewrite Spanish page" : "Write Spanish page"}</button>${c.es ? `<a class="btn btn--small" href="#/full/${id}/es">See it</a><button class="btn btn--small" type="button" data-eact="es-remove">Remove</button>` : ""}</div>
      </section>`;
  }

  // Unsaved edits survive a reload (fold/unfold can recreate the Android activity): the form's values, keyed by lead.
  const draftKey = (id) => `wb_draft_${id}`;
  function formValues(f) {
    const out = {};
    for (const el of f.elements) {
      if (!el.name || el.type === "file" || el.type === "submit" || el.type === "button") continue;
      out[el.name] = el.type === "checkbox" ? !!el.checked : el.value;
    }
    return out;
  }
  function applyValues(f, vals) {
    for (const el of f.elements) {
      if (!el.name || !(el.name in vals) || el.type === "file") continue;
      if (el.type === "checkbox") el.checked = !!vals[el.name]; else el.value = vals[el.name];
    }
  }

  async function viewEdit(id) {
    setNav("home");
    const my = renderSeq;
    const l = await api("/leads/" + id);
    if (stale(my)) return;
    if (!l.record) return go("#/lead/" + id);
    const r = l.record;
    const c = l.copy;
    const cat = r.category;
    const isR = cat === "restaurant";
    const isC = cat === "contractor";
    const isS = cat === "salon";
    const isA = cat === "auto";
    const isL = cat === "landscaping";
    const isK = cat === "cleaning";
    const isP = cat === "print";
    const isRt = cat === "retail";
    const isF = cat === "finance";
    const isCh = cat === "church";
    const isM = isS && r.variant === "massage";
    const serviceArea = isC || isL || isK;
    const hasServices = !isR;
    const hasTowns = isC || isL || isK || isA;
    const ext = r.ext[cat] || {};
    const conf = new Set(r.confirmed);
    const t = r.testimonials.concat([{}, {}, {}]).slice(0, 3);
    const cb = (name, label, on) => `<label class="check"><input type="checkbox" name="${name}"${on ? " checked" : ""}> ${label}</label>`;
    const confirmable = [["name", "Business name is right"], ["phone", "Phone number is right"], ["address", "Address is right"]];
    if (r.hours) confirmable.push(["hours", "Hours are right"]);
    if (hasServices) confirmable.push(["services", isS ? "Services and prices are right" : "Services list is right"]);
    if (hasTowns) confirmable.push(["service_area", "Service area towns are right"]);
    if (isR) confirmable.push(["menu", "Menu is right"]);
    const priceOf = (s) => {
      const p = s.price;
      if (!p) return "";
      if (p.mode === "exact") return `$${p.amount}`;
      if (p.mode === "from") return `from $${p.amount}`;
      if (p.mode === "range") return `$${p.min}-$${p.max}`;
      if (p.mode === "quote") return "consult";
      return "";
    };
    const serviceLines = r.services.map((s) => (isS && priceOf(s) ? `${s.name} | ${priceOf(s)}` : s.name)).join("\n");
    const lic = r.licenses[0] || {};
    const w = ext.warranty || {};
    $app.innerHTML = `<p><a href="#/lead/${id}">← Details</a></p><h1>Edit ${esc(r.name)}</h1>
    <form id="ef"><div class="grid grid--2"><div>
      <section class="card"><h2>Confirm with the owner</h2>
        <label class="field">Business name<input name="name" value="${esc(r.name)}" required></label>
        <label class="field">Phone<input name="phone" type="tel" value="${esc(r.phone.display)}" required></label>
        ${cb("smsEnabled", "This number takes texts", r.smsEnabled)}
        ${serviceArea ? cb("showStreetAddress", "Show the street address (they have a storefront)", r.showStreetAddress) : ""}
        <hr style="border:0;border-top:1px solid var(--line);margin:12px 0">
        ${confirmable.map(([k, label]) => cb("confirm_" + k, label, conf.has(k))).join("")}
      </section>
      ${photoCardHtml(r)}
      ${galleryCardHtml(id, r)}
      ${esCardHtml(id, c)}
      <section class="card"><h2>We're hiring</h2>
        <p class="small muted">Optional. Adds a “We're hiring” section with Call/Text buttons. Leave the jobs empty to remove it.</p>
        <label class="field">Jobs open (one per line)<textarea name="hiringRoles" rows="3" placeholder="Line cook&#10;Server">${esc(((r.hiring || {}).roles || []).join("\n"))}</textarea></label>
        <label class="field">How to apply<input name="hiringHow" maxlength="240" value="${esc((r.hiring || {}).how || "")}" placeholder="Stop by between 2 and 4, or give us a call."></label>
      </section>
      <section class="card"><h2>Design</h2><label class="field">Colors &amp; fonts<select name="lookBase">${l.looks
        .map((x) => `<option value="${esc(x.id)}"${x.id === l.lookBase ? " selected" : ""}>${esc(x.name)}</option>`)
        .join("")}</select></label>
        <label class="field">Layout<select name="layout">${(l.layouts || [])
        .map((x) => `<option value="${esc(x.id)}"${x.id === l.layout ? " selected" : ""}>${esc(x.name)}: ${esc(x.about)}</option>`)
        .join("")}</select></label></section>
      <section class="card"><h2>Facts (only if the owner says so)</h2>
        <label class="field">Year they started<input name="foundedYear" type="number" inputmode="numeric" min="1800" max="2100" value="${r.foundedYear || ""}"></label>
        ${cb("familyOwned", "Family-owned", r.ownershipTags.includes("family_owned"))}
        ${isS ? `<label class="field">Walk-ins or appointments?<select name="walkIns"><option value="">Not set yet</option>${[["welcome", "Walk-ins welcome"], ["appointment_only", "By appointment only"], ["both", "Both"]].map(([v, label]) => `<option value="${v}"${ext.walkIns === v ? " selected" : ""}>${label}</option>`).join("")}</select></label>` : ""}
        ${isC || isL || isK ? cb("insured", "Insured", !!r.insured) : ""}
        ${isK ? cb("bonded", "Bonded", !!r.bonded) : ""}
        ${isC || isL || isM ? `<div class="row"><label class="field">License type<input name="licenseLabel" value="${esc(lic.label || "")}" placeholder="${isC ? "AL Plumbing License" : isM ? "AL Massage Therapist License" : "License"}"></label>
          <label class="field">License #<input name="licenseNumber" value="${esc(lic.number || "")}"></label></div>` : ""}
        ${isC ? cb("emergencyService", "Offers emergency service", !!ext.emergencyService) : ""}
        ${isA ? `${cb("ase", "ASE-certified", !!ext.ase)}
          <div class="row"><label class="field">Warranty months<input name="warrantyMonths" type="number" inputmode="numeric" value="${w.months || ""}"></label>
          <label class="field">Warranty miles<input name="warrantyMiles" type="number" inputmode="numeric" value="${w.miles || ""}"></label></div>
          ${cb("warrantyNationwide", "Warranty is nationwide", !!w.nationwide)}` : ""}
        ${isK ? `${cb("backgroundChecked", "Team is background-checked", !!ext.backgroundChecked)}${cb("suppliesIncluded", "They bring their own supplies", !!ext.suppliesIncluded)}${cb("petSafe", "Uses pet-safe products", !!ext.petSafe)}` : ""}
        ${isC || isA || isL || isK ? cb("freeEstimates", isA || isC ? "Free estimates" : "Free quotes", !!ext.freeEstimates) : ""}
        ${isP ? `${cb("designHelp", "They help design artwork", !!ext.designHelp)}${cb("proofBeforePrint", "They send a proof before printing", !!ext.proofBeforePrint)}${r.variant === "signs" ? cb("install", "They install signs", !!ext.install) : ""}` : ""}
        ${isRt ? `${cb("giftCards", "They sell gift cards", !!ext.giftCards)}${cb("delivery", "They deliver", !!ext.delivery)}` : ""}
      </section>
      ${isF ? financeEditCard(r, ext, cb) : ""}
      ${isCh ? churchEditCard(r, ext, cb) : ""}
      <section class="card"><h2>Links</h2>
        ${isR ? `<label class="field">Online ordering link<input name="order" type="url" value="${esc(r.links.order || "")}" placeholder="https://"></label>
        <label class="field">Reservations link<input name="reserve" type="url" value="${esc(r.links.reserve || "")}" placeholder="https://"></label>` : ""}
        ${isRt ? `<label class="field">${r.variant === "florist" ? "Online flower order page" : "Online shop (Shopify, Etsy, Facebook shop)"}<input name="shop" type="url" value="${esc(ext.shopUrl || "")}" placeholder="https://"></label>` : ""}
        ${isP ? `<label class="field">Email for artwork<input name="email" type="email" value="${esc(r.email || "")}" placeholder="orders@…"></label>` : ""}
        <label class="field">Online booking link<input name="booking" type="url" value="${esc(r.links.booking || "")}" placeholder="https://"></label>
        <label class="field">Facebook page<input name="facebook" type="url" value="${esc(r.links.social.facebook || "")}" placeholder="https://facebook.com/…"></label>
        <label class="field">Instagram<input name="instagram" type="url" value="${esc(r.links.social.instagram || "")}" placeholder="https://instagram.com/…"></label>
      </section>
    </div><div>
      <section class="card"><h2>Text</h2>
        <label class="field">Headline line<input name="heroTagline" value="${esc(c.heroTagline)}"></label>
        <label class="field">Short intro<textarea name="heroSub">${esc(c.heroSub)}</textarea></label>
        <label class="field">About (blank line between paragraphs)<textarea name="about" rows="8">${esc(c.about.join("\n\n"))}</textarea></label>
        <label class="field">Closing heading<input name="ctaTitle" value="${esc(c.ctaTitle)}"></label>
        <label class="field">Closing line<input name="ctaLine" value="${esc(c.ctaLine)}"></label>
        <label class="field">Google search description <span class="hint">About 150 characters</span><textarea name="metaDescription" rows="3">${esc(c.meta.description)}</textarea></label>
        ${hasServices ? r.services.map((s) => `<label class="field">${esc(s.name)}<textarea name="blurb_${esc(s.id)}" rows="3">${esc(c.serviceBlurbs[s.id] || "")}</textarea></label>`).join("") : ""}
      </section>
      ${isR ? `<section class="card"><h2>Menu</h2><p class="small muted">One item per line: <code>Name | $Price | Description</code>. Start a section with <code># Section name</code>.</p>
        <label class="field"><span class="sr-only">Menu</span><textarea name="menuText" rows="12" placeholder="# Plates&#10;Pulled pork plate | $12 | Two sides and bread">${esc(l.menuText)}</textarea></label></section>` : ""}
      ${hasServices ? `<section class="card"><h2>${hasTowns ? "Services &amp; area" : "Services"}</h2>
        <label class="field">${isS ? "Services and prices, one per line <span class=\"hint\">e.g. <code>Haircut | $25</code> or <code>Color | from $80</code></span>" : "Services (one per line)"}<textarea name="services" rows="7">${esc(serviceLines)}</textarea></label>
        ${hasTowns ? `<label class="field">Towns served (comma separated)<textarea name="towns" rows="3">${esc((r.serviceArea || { towns: [] }).towns.join(", "))}</textarea></label>` : ""}</section>` : ""}
      <section class="card"><h2>Customer quotes</h2><p class="small muted">Only real quotes the customer said you can use. Never copy Google reviews.</p>
        ${t.map((q, i) => `<label class="field">Quote ${i + 1}<textarea name="q${i}" rows="2">${esc(q.quote || "")}</textarea></label>
          <div class="row"><label class="field">Name<input name="qn${i}" value="${esc(q.displayName || "")}" placeholder="Amy R."></label><label class="field">Town<input name="qt${i}" value="${esc(q.town || "")}"></label></div>`).join("")}
      </section>
      <section class="card">${cb("approved", "<strong>The owner has read and approved all the text</strong>", c.approved)}</section>
    </div></div>
    <div class="sticky-save btns btns--full"><button class="btn btn--primary" type="submit">Save &amp; update preview</button><a class="btn" href="#/preview/${id}">Preview</a></div>
    </form>`;

    const form = $app.querySelector("#ef");
    // Unsaved typing: remembered on this phone, guarded on the way out.
    let dirty = false;
    try {
      const saved = sessionStorage.getItem(draftKey(id));
      if (saved) { applyValues(form, JSON.parse(saved)); dirty = true; toast("Restored what you'd typed before"); }
    } catch (e) { /* storage blocked or bad draft */ }
    form.addEventListener("input", () => {
      dirty = true;
      try { sessionStorage.setItem(draftKey(id), JSON.stringify(formValues(form))); } catch (e) { /* storage blocked */ }
    });
    leaveGuard = () => !dirty || confirm("Leave without saving? Your changes to the text and facts aren't saved yet.");
    const onUnload = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    addEventListener("beforeunload", onUnload);
    onLeave(() => removeEventListener("beforeunload", onUnload));

    // Replace just the cards an action changed, from a fresh copy of the lead.
    const refreshCards = async (...ids) => {
      const fresh = await api("/leads/" + id);
      if (stale(my)) return;
      const html = { "card-photo": () => photoCardHtml(fresh.record), "card-gallery": () => galleryCardHtml(id, fresh.record), "card-es": () => esCardHtml(id, fresh.copy) };
      for (const cid of ids) { const el = document.getElementById(cid); if (el) el.outerHTML = html[cid](); }
    };
    form.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-eact]");
      if (!b) return;
      const act = b.dataset.eact;
      const label = b.textContent;
      const busy = (t) => { b.disabled = true; b.textContent = t; };
      const idle = () => { if (b.isConnected) { b.disabled = false; b.textContent = label; } };
      try {
        if (act === "upload") {
          const file = $app.querySelector("#photo").files[0];
          if (!file) return toast("Choose a photo first");
          busy("Uploading…");
          const { blob, w: pw, h: ph } = await resizeImage(file);
          const alt = $app.querySelector("#photoAlt").value || r.name;
          await api(`/leads/${id}/photo?w=${pw}&h=${ph}&alt=${encodeURIComponent(alt)}`, { method: "POST", body: blob, type: "image/jpeg" });
          toast("Photo saved");
          await refreshCards("card-photo");
        } else if (act === "gupload") {
          const files = [...$app.querySelector("#gallery").files];
          if (!files.length) return toast("Choose photos first");
          const alt = $app.querySelector("#galleryAlt").value || `Photo of ${r.name}`;
          for (const [i, file] of files.entries()) {
            busy(`Uploading ${i + 1} of ${files.length}…`);
            const { blob, w: pw, h: ph } = await resizeImage(file);
            await api(`/leads/${id}/gallery?w=${pw}&h=${ph}&alt=${encodeURIComponent(alt)}`, { method: "POST", body: blob, type: "image/jpeg" });
          }
          toast(files.length === 1 ? "Photo added" : `${files.length} photos added`);
          await refreshCards("card-gallery");
        } else if (act === "delphoto") {
          if (!confirm("Remove this photo from the site?")) return;
          await api(`/leads/${id}/gallery/${b.dataset.photo}`, { method: "DELETE" });
          toast("Photo removed");
          await refreshCards("card-gallery");
        } else if (act === "es-write") {
          busy("Writing… (about 20 seconds)");
          await api(`/leads/${id}/spanish`, { method: "POST" });
          toast("Spanish page ready");
          await refreshCards("card-es");
        } else if (act === "es-remove") {
          if (!confirm("Remove the Spanish page?")) return;
          await api(`/leads/${id}/spanish`, { method: "DELETE" });
          toast("Spanish page removed");
          await refreshCards("card-es");
        }
      } catch (err) { toast(err.message); } finally { idle(); }
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target;
      const val = (n) => (f.elements[n] ? f.elements[n].value.trim() : undefined);
      const on = (n) => (f.elements[n] ? f.elements[n].checked : undefined);
      const num = (n) => (val(n) ? Number(val(n)) : null);
      const confirmed = confirmable.map(([k]) => k).filter((k) => on("confirm_" + k));
      const testimonials = [0, 1, 2].map((i) => ({ quote: val("q" + i), displayName: val("qn" + i), town: val("qt" + i) || undefined })).filter((q) => q.quote && q.displayName);
      const blurbs = {};
      if (hasServices) r.services.forEach((s) => { const v = val("blurb_" + s.id); if (v !== undefined) blurbs[s.id] = v; });
      const edits = {
        look: val("lookBase") + "~" + val("layout"),
        record: {
          name: val("name"),
          phone: val("phone"),
          smsEnabled: on("smsEnabled"),
          showStreetAddress: serviceArea ? on("showStreetAddress") : undefined,
          foundedYear: num("foundedYear"),
          familyOwned: on("familyOwned"),
          insured: on("insured"),
          bonded: on("bonded"),
          license: isC || isL || isM ? (val("licenseNumber") ? { label: val("licenseLabel") || "License", number: val("licenseNumber") } : null) : undefined,
          emergencyService: on("emergencyService"),
          freeEstimates: on("freeEstimates"),
          walkIns: isS ? val("walkIns") || null : undefined,
          ase: on("ase"),
          warranty: isA ? { months: num("warrantyMonths"), miles: num("warrantyMiles"), nationwide: !!on("warrantyNationwide") } : undefined,
          backgroundChecked: on("backgroundChecked"),
          suppliesIncluded: on("suppliesIncluded"),
          petSafe: on("petSafe"),
          links: { order: val("order"), reserve: val("reserve"), booking: val("booking"), facebook: val("facebook"), instagram: val("instagram"), ...(isRt ? { shop: val("shop") } : {}) },
          hiring: (() => { const roles = (val("hiringRoles") || "").split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 8); return roles.length ? { roles, how: val("hiringHow") || "" } : null; })(),
          ...(isP ? { email: val("email"), designHelp: on("designHelp"), proofBeforePrint: on("proofBeforePrint"), ...(r.variant === "signs" ? { install: on("install") } : {}) } : {}),
          ...(isRt ? { giftCards: on("giftCards"), delivery: on("delivery") } : {}),
          ...(isF ? { finance: financeEditValues(f, r) } : {}),
          ...(isCh ? { church: churchEditValues(f) } : {}),
          testimonials,
          towns: hasTowns ? val("towns").split(",").map((s) => s.trim()).filter(Boolean) : undefined,
          services: hasServices ? val("services").split("\n").map((s) => s.trim()).filter(Boolean) : undefined,
          menuText: isR ? f.elements.menuText.value : undefined,
          confirmed,
        },
        copy: {
          heroTagline: val("heroTagline"),
          heroSub: val("heroSub"),
          about: val("about").split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean),
          ctaTitle: val("ctaTitle"),
          ctaLine: val("ctaLine"),
          metaDescription: val("metaDescription"),
          serviceBlurbs: hasServices ? blurbs : undefined,
          approved: on("approved"),
        },
      };
      const btn = f.querySelector("button[type=submit]");
      btn.disabled = true;
      try {
        await api(`/leads/${id}/edits`, { method: "PUT", json: edits });
        dirty = false;
        try { sessionStorage.removeItem(draftKey(id)); } catch (e) { /* storage blocked */ }
        toast("Saved. Preview updated.");
        go("#/lead/" + id);
      } catch (err) { toast(err.message); } finally { btn.disabled = false; }
    });
  }

  /* ---------- call guide ---------- */
  async function shareLink(id) {
    const { url } = await api(`/leads/${id}/share`, { method: "POST" });
    return url;
  }

  // Who's sending: a caller's own login name, or the owner's name from Settings (asked once if it's missing).
  function senderName() {
    if (!isOwner() || (meta.me.id && meta.me.id !== "owner")) return meta.me.name;
    let n = meta.settings.callerName;
    if (!n) { try { n = localStorage.getItem("wb-owner-name") || ""; } catch (e) { n = ""; } }
    if (!n) {
      n = (prompt("What name should your texts use? (\"Hi, this is ___ with …\")") || "").trim();
      if (n) { try { localStorage.setItem("wb-owner-name", n); } catch (e) { /* private mode */ } }
    }
    return n;
  }

  /** "Hi, this is Fox with Underground Associates." */
  function greeting() {
    const name = senderName();
    const co = meta.settings.companyName;
    return `Hi, this is ${name || "me"}${co ? ` with ${co}` : ""}.`;
  }

  // "Text preview link" / "Copy preview link": a 14-day link that opens the preview without logging in.
  function shareButtonsHtml() {
    return `<div class="btns btns--full" data-share><button class="btn" type="button" data-share-sms>💬 Text preview link</button><button class="btn" type="button" data-share-copy>🔗 Copy message + link</button></div>
      <p class="small muted">Only text the link after they say it's OK. It works for 14 days, no login needed.</p>
      <details class="more"><summary>Follow-up texts</summary><div class="btns btns--full">${FOLLOW_UPS.map((f, i) => `<button class="btn btn--small" type="button" data-follow="${i}">${esc(f.label)}</button>`).join("")}</div>
        <p class="small muted">Each one opens a text with a fresh preview link. Send it yourself; skip it if they asked you to stop.</p></details>`;
  }

  // Ready-to-send follow-ups after a preview was shown or texted.
  const FOLLOW_UPS = [
    { label: "👀 Did you get a look?", text: (g, name, url) => `${g} Just checking in: did you get a chance to look at the website preview for ${name}? Here it is again: ${url}` },
    { label: "🙋 Any questions?", text: (g, name, url) => `${g} Any questions about the website for ${name}? Happy to change anything, add your own photos, or walk you through it: ${url}` },
    { label: "👋 Last check-in", text: (g, name, url) => `${g} Last check-in on the website preview for ${name}. I'll keep it ready for you a little longer. If now's not a good time, no worries at all. ${url}` },
  ];

  function bindShareButtons(l) {
    const name = l.record ? l.record.name : l.name;
    const digits = phoneDigits(l);
    const smsBody = (url) => `${greeting()} Here's the free website preview I made for ${name}: ${url}`;
    // Every link made here goes in the call log by itself (fire and forget; the sms: hand-off doesn't wait).
    const logSent = (which) => api(`/leads/${l.id}/log`, { method: "POST", json: { outcome: "link_sent", note: which }, keepalive: true }).catch(() => {});
    $app.querySelectorAll("[data-share-sms]").forEach((b) => b.addEventListener("click", async () => {
      b.disabled = true;
      try {
        const url = await shareLink(l.id);
        logSent("Text preview link");
        location.href = `sms:+1${digits}?body=${encodeURIComponent(smsBody(url))}`;
      } catch (err) { toast(err.message); } finally { b.disabled = false; }
    }));
    $app.querySelectorAll("[data-follow]").forEach((b) => b.addEventListener("click", async () => {
      b.disabled = true;
      try {
        const url = await shareLink(l.id);
        logSent(`Follow-up: ${FOLLOW_UPS[Number(b.dataset.follow)].label}`);
        location.href = `sms:+1${digits}?body=${encodeURIComponent(FOLLOW_UPS[Number(b.dataset.follow)].text(greeting(), name, url))}`;
      } catch (err) { toast(err.message); } finally { b.disabled = false; }
    }));
    $app.querySelectorAll("[data-share-copy]").forEach((b) => b.addEventListener("click", async () => {
      b.disabled = true;
      try {
        const url = await shareLink(l.id);
        logSent("Copy message + link");
        const msg = smsBody(url);
        try { await navigator.clipboard.writeText(msg); toast("Message with the preview link copied. Paste it anywhere."); }
        catch (e) { prompt("Copy this message:", msg); }
      } catch (err) { toast(err.message); } finally { b.disabled = false; }
    }));
  }

  async function viewPitch(id, regenerate) {
    setNav("home");
    const my = renderSeq;
    const l = await api("/leads/" + id);
    if (stale(my)) return;
    if (l.status !== "ready") return go("#/lead/" + id);
    const r = l.record;
    const s = meta.settings;
    $app.innerHTML = `<p><a href="#/lead/${id}">← Details</a></p>
      <h1>Call guide: ${esc(r.name)}</h1>
      <p class="muted">${esc(l.variantLabel || "")} · ${esc(l.reason || "")}</p>
      ${contactLine(l) ? `<p>${contactLine(l)}</p>` : ""}
      <div class="btns btns--full" style="margin-bottom:8px">
        <a class="btn btn--primary" href="${telHref(phoneDigits(l))}">📞 Call ${esc(r.phone.display)}</a>
      </div>
      ${shareButtonsHtml()}
      <p><a class="btn btn--small" href="#/playbook">💬 Plans & answers</a> <a class="btn btn--small" href="#/walkin/${id}">🚶 Going in person?</a></p>
      ${isOwner() && (!s.companyName || !s.monthlyPrice) ? `<div class="card small">Add your company name, your name and your prices in <a href="#/settings">Settings</a> so the guide can use them.</div>` : ""}
      ${l.notes.length ? `<section class="card"><h2>Earlier calls</h2>${l.followUp ? `<p>${followChip(l.followUp)}</p>` : ""}${notesHtml(l, 3)}</section>` : ""}
      <div id="guide"><div class="card"><span class="spin"></span> Writing the call guide for ${esc(r.name)}… (about 20 seconds)</div></div>`;

    bindShareButtons(l);

    let pitch;
    try {
      ({ pitch } = await api(`/leads/${id}/pitch`, { method: regenerate ? "POST" : "GET" }));
    } catch (err) {
      document.getElementById("guide").innerHTML = `<div class="card">${esc(err.message)}</div>`;
      return;
    }
    if (stale(my) || location.hash !== `#/pitch/${id}`) return;
    const list = (items) => `<ul class="list">${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
    document.getElementById("guide").innerHTML = `
      <section class="card opener"><h2>Open with</h2><p class="big">${esc(pitch.opener)}</p></section>
      <div class="grid grid--2">
        <section class="card"><h2>Why it matters for them</h2>${list(pitch.whyItMatters)}</section>
        <section class="card"><h2>What we already built</h2>${list(pitch.whatWeBuilt)}<a class="btn btn--small" href="#/preview/${id}">Open the preview</a></section>
      </div>
      <section class="card"><h2>Questions to ask</h2>${list(pitch.questionsToAsk)}</section>
      <section class="card"><h2>If they say…</h2><p class="small"><a href="#/playbook">💬 All plans & common answers</a></p>${pitch.objections.map((o) => `<details class="obj"><summary>“${esc(o.objection)}”</summary><p>${esc(o.response)}</p></details>`).join("")}</section>
      <section class="card opener"><h2>Ask for the yes</h2><p class="big">${esc(pitch.close)}</p></section>
      <section class="card"><h2>Don't say</h2>${list(pitch.avoid)}</section>
      ${l.salesStatus !== "live" ? signupCardHtml(l) + logCardHtml(l) : ""}
      <p><button class="btn btn--small" id="regen">Write a fresh guide</button></p>`;
    bindLog(l, () => go("#/lead/" + id));
    bindSignup(l, () => go("#/lead/" + id));
    document.getElementById("regen").addEventListener("click", () => viewPitch(id, true));
  }

  /* ---------- ways to pay (shared by Show plans and Plans & answers) ---------- */
  // Mirrors billingOptions() in src/worker/db.ts: 6- and 12-month plans have no setup fee; month to month does.
  // church: churches and nonprofits get a bigger yearly discount (Settings → churchAnnualMonthsFree, default 4).
  function payTerms(s, church) {
    const min = s.minMonths ?? 12;
    const short = s.shortMonths ?? 6;
    const commits = [short && min && short < min ? short : null, min || null].filter(Boolean);
    const free = church ? (s.churchAnnualMonthsFree ?? 4) : (s.annualMonthsFree ?? 2);
    return { min, short: commits.length > 1 ? short : 0, commits, flex: min ? (s.flexSetup ?? 299) : 0, free, church: !!church };
  }
  /** "6- or 12-month" */
  const commitWords = (t) => t.commits.length > 1 ? `${t.commits[0]}- or ${t.commits[1]}-month` : `${t.commits[0]}-month`;
  function payWays(s, plans, church) {
    const t = payTerms(s, church);
    const out = t.commits.map((m) => [`${m}-month plan`, `The monthly price, no setup fee. After ${m} months, cancel any time with 30 days' notice.`]);
    if (!t.commits.length) out.push(["Monthly", "The monthly price. Cancel any time."]);
    if (t.flex) out.push(["Month to month", `Same monthly price plus a one-time ${money(t.flex)} setup fee. No contract, cancel any time.`]);
    if (t.free) out.push([`Pay yearly, ${t.free} months free`, `12 months for the price of ${12 - t.free}${t.church ? " for churches and nonprofits" : ""}, no setup fee. ${plans.map((p) => `${esc(p.name)} ${money(p.monthly * (12 - t.free))}/year`).join(" · ")}`]);
    return out;
  }

  /* ---------- plans to show the customer ---------- */
  // Customer-facing words for each tier; prices and "what's included" come live from Settings.
  const PLAN_TAGLINE = {
    basic: "Get found on Google and get the phone ringing.",
    plus: "Your website, plus getting found on Google Maps.",
    pro: "Everything handled for you, every month.",
  };
  const EVERY_PLAN = ["We build it for you", "Fast, secure hosting", "Changes when you text us", "Made for phones", "Your name, photos and words stay yours"];

  async function viewShowPlans(leadId) {
    stopPolling();
    const my = renderSeq;
    const s = meta.settings;
    const plans = (s.plans.length ? s.plans : SUGGESTED_PLANS).filter((p) => p.monthly);
    const lead = leadId ? await api("/leads/" + leadId).catch(() => null) : null;
    if (stale(my)) return;
    const business = lead ? (lead.record ? lead.record.name : lead.name) : "";
    const company = s.companyName || "Underground Associates";
    const church = !!lead && lead.category === "church";
    const t = payTerms(s, church);
    const perDay = (m) => money(Math.round((m * 12 / 365) * 100) / 100);
    $nav.hidden = true;
    document.body.classList.add("showing");
    $app.innerHTML = `<div class="show">
      <div class="show__top"><a href="${leadId ? `#/lead/${leadId}` : "#/"}" class="show__back">← Back</a><span class="show__co">${esc(company)}</span></div>
      <header class="show__head">
        <h1>${business ? `Website plans for ${esc(business)}` : "Website plans"}</h1>
        <p>${t.commits.length ? `<strong>No setup fee on ${commitWords(t)} plans.</strong>${t.flex ? ` Month to month has a one-time ${money(t.flex)} setup fee.` : ""}` : "One simple monthly price."} We build your site, host it and keep it running.</p>
      </header>
      <div class="show__plans">${plans.map((p) => {
        const items = String(p.includes || "").split("\n").map((x) => x.trim()).filter(Boolean);
        const star = p.id === "plus";
        return `<section class="show__plan${star ? " show__plan--star" : ""}">
          ${star ? `<p class="show__badge">Most popular</p>` : ""}
          <h2>${esc(p.name)}</h2>
          <p class="show__tag">${esc(PLAN_TAGLINE[p.id] || "")}</p>
          <p class="show__price"><strong>${money(p.monthly)}</strong><span>/month</span></p>
          <p class="show__day">${p.setup ? `${money(p.setup)} setup · ` : t.commits.length ? `No setup fee on ${commitWords(t)} plans · ` : ""}about ${perDay(p.monthly)} a day</p>
          <ul>${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
          ${leadId ? `<button class="show__choose" data-choose="${esc(p.id)}">Choose ${esc(p.name)}</button>` : ""}
        </section>`;
      }).join("")}</div>
      <section class="show__box"><h2>Every plan includes</h2><ul class="show__every">${EVERY_PLAN.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></section>
      <section class="show__box"><h2>Ways to pay</h2><div class="show__ways">
        ${payWays(s, plans, church).map(([h, d]) => `<div><h3>${esc(h)}</h3><p>${d}</p></div>`).join("")}
      </div></section>
      ${s.addons && s.addons.length ? `<section class="show__box"><h2>Add-ons</h2><ul class="show__addons">${s.addons.map((a) => `<li><span>${esc(a.name)}${a.about ? `<small>${esc(a.about)}</small>` : ""}</span><strong>${esc(addonPrice(a))}</strong></li>`).join("")}</ul></section>` : ""}
      <p class="show__fine">You see your website before you pay anything, and nothing goes live until you say so. Cancel with 30 days' notice${t.commits.length ? ` once your ${commitWords(t)} plan's months are up` : ""}.</p>
    </div>`;
    $app.querySelectorAll("[data-choose]").forEach((b) => b.addEventListener("click", async () => {
      b.disabled = true;
      b.textContent = "Opening sign-up…";
      try {
        const res = await api(`/leads/${leadId}/signup`, { method: "POST", json: { plan: b.dataset.choose } });
        location.href = res.url;
      } catch (err) { toast(err.message); b.disabled = false; b.textContent = "Try again"; }
    }));
  }

  /* ---------- plans & answers (for callers) ---------- */
  // Selling points by plan tier. Prices, names and "what's included" come live from Settings.
  const PLAN_PITCH = {
    basic: {
      fit: "A business that just needs to be found on Google and get the phone ringing.",
      points: [
        "No big bill up front: no setup fee on the 6- or 12-month plan. A custom website usually costs $1,500 to $5,000 before hosting.",
        "We handle hosting, security and updates. They never have to touch a computer.",
        "Need a change? Text us: hours, holiday closures, a new photo.",
        "Built for phones, with tap-to-call and directions on every page.",
      ],
      line: "If it brings you one new customer a month, it's paid for itself.",
    },
    plus: {
      fit: "Most businesses. Anyone who gets customers from Google Maps (restaurants, salons, shops, auto, trades).",
      points: [
        "A monthly text showing how many people looked at their site and tapped to call or get directions. Proof it's working.",
        "We tune up their Google listing (hours, photos, services, description). That's where most local customers find them, and it's a $149 job on its own.",
        "Review QR cards for the counter. More reviews push them higher on Google Maps.",
      ],
      line: "Most folks pick Plus. It's the website plus getting you found on Google Maps.",
    },
    pro: {
      fit: "Busy owners who want it all handled, and businesses in a crowded field (roofing, HVAC, restaurants).",
      points: [
        "We post on their Google profile every month and keep photos fresh. Active profiles tend to show up more.",
        "Their own domain name and a business email like info@theirbusiness.com. Looks established. Their choice: free forwarding into the email they already check, or a full Google mailbox we set up (Google bills them directly, about $7–8 a month).",
        "Their changes go to the front of the line.",
        "Agencies charge $100 to $400 a month just to manage a Google profile.",
      ],
      line: "You run the business. We'll keep you looking sharp online every month.",
    },
  };

  const PLAN_QUESTIONS = [
    ["Tight budget, or only wants the basics?", "Basic"],
    ["Most of their customers find them on Google or Maps?", "Plus"],
    ["Wants proof it's working?", "Plus (monthly report)"],
    ["Wants everything done for them, or has lots of competition?", "Pro"],
    ["Already owns a domain name, or wants a business email?", "Pro (free email forwarding, or a Google mailbox Google bills them for)"],
  ];

  // Common things owners say on the call, and an honest answer to each.
  function playbookObjections(s, plans) {
    const cheapest = plans.reduce((a, p) => (p.monthly && (!a || p.monthly < a.monthly) ? p : a), null);
    const low = cheapest ? `${esc(cheapest.name)} is ${money(cheapest.monthly)} a month, about ${money(Math.round((cheapest.monthly * 12 / 365) * 100) / 100)} a day` : "Our starter plan is low monthly";
    const t = payTerms(s);
    const min = t.min;
    const flex = t.flex;
    const us = s.companyName || "we";
    return [
      ["“I don't need a website. I get plenty of business from word of mouth.”",
        "That's great, word of mouth is the best kind. But when someone hears about you, the first thing they do is look you up on their phone. This makes sure they find your hours and number right away, and not the place down the road."],
      ["“I already have a Facebook page.”",
        "Keep it! We link to it from the site. But a lot of people aren't on Facebook, and Facebook pages don't show up well on Google. The website is yours, it shows up on Google, and it works for everybody."],
      ["“It's too expensive.” / “I can't afford it right now.”",
        `I hear you. ${low}, with no setup fee on the ${commitWords(t)} plan. If it brings you one customer a month, it pays for itself. Want to start there? You can move up any time.`],
      ["“I don't want a contract.” / “A year is too long.”",
        `${t.short ? `No problem. There's a ${t.short}-month plan, same price and still no setup fee. ` : "No problem. "}${flex ? `Or go month to month: same monthly price, a one-time ${money(flex)} setup fee, and cancel any time with 30 days' notice.` : "You can cancel any time with 30 days' notice."}`],
      ["“Do I have to pay extra for email?”",
        "No. Pro comes with a business email like info@yourbusiness.com that forwards free to the email you already use. If you want a full mailbox you can send from too, we set up Google's for you and Google bills you directly, about $7 to $8 a month. We don't mark it up."],
      ["“I need to think about it.”",
        "Of course. Can I ask what you want to think over: the price, or whether it'll bring in business? (Answer that.) I'll text you the preview so you can look at it tonight. Is Thursday good for a quick call back? (Log the callback.)"],
      ["“I need to talk to my wife / husband / partner.”",
        "Makes sense. I'll text you the preview link so you can show them on your phone. When's a good time to call back after you've both looked? (Log the callback.)"],
      ["“Just send me some information.” / “Email me something.”",
        "Sure. Better than a brochure, I'll text you your actual website. It only takes a minute to look at. (Text the preview link, then set a callback for 2 or 3 days.)"],
      ["“My nephew / a friend can build me one.”",
        "That works for some folks. The difference is we keep it running every month: hosting, security, and changes when you text us, without waiting on anybody's free time. And yours is already built. You can see it right now."],
      ["“I already have a website.”",
        "Read the lead's reason line first. If it's broken, old or not made for phones, say what's wrong: “I pulled it up and it [doesn't load / is hard to use on a phone]. Most people look you up on their phone, so that's costing you calls.” If they own the domain, it stays theirs. We just point it at the new site."],
      ["“I'm too busy for this.”",
        "That's the point: it takes almost nothing from you. It's already built. All I need is a few minutes to check your hours and services. After that, you just text us changes."],
      ["“I'm not good with computers.”",
        "You don't have to be. We do all of it. If you want something changed, you text us like you'd text a friend."],
      ["“Is this a scam?” / “I've been burned before.”",
        `Fair question. ${s.companyName ? `${esc(s.companyName)} is a local company here in Cullman.` : "We're local, here in Cullman."} You can see your site before you pay anything, nothing goes live until you say so, and you sign up and pay through a secure link. I never take card numbers over the phone.`],
      ["“Do I own it?” / “What if I cancel?”",
        `Your name, logo, photos and text are always yours, and a domain you own stays in your name. ${min ? `After the first ${min} months you can cancel any time with 30 days' notice` : "You can cancel any time with 30 days' notice"}, and we'll send you a copy of the site's files if you ask.`],
      ["“Can you guarantee more customers?”",
        "Nobody honest can promise that. What I can tell you is that it's built to show up on Google and make it easy to call you, and with Plus you get a text every month showing how many people looked and tapped to call."],
      ["“Can I make changes myself?”",
        "You don't need to. Text us and we'll do it. Small changes like hours, prices and photos are included in every plan."],
      ["“Business is good. I'm not taking new customers.”",
        "Good to hear! A site still saves you phone time: people see your hours, services and directions before they call. And it keeps you strong if things slow down."],
      ["“Why does it cost money every month?”",
        "The monthly covers hosting, security, keeping it working on new phones, and your changes. You never get hit with a surprise bill to fix something. If you pay for the year, you get 2 months free."],
      ["“I'm not interested.”",
        `No problem at all. I built this one for you either way, so can I text you the link in case you change your mind? (If they say no, thank them and log “Not interested”. Never push past a second no.)`],
    ];
  }

  async function viewPlaybook() {
    setNav("home");
    const s = meta.settings;
    const plans = s.plans.length ? s.plans : SUGGESTED_PLANS;
    const t = payTerms(s);
    const perDay = (m) => money(Math.round((m * 12 / 365) * 100) / 100);
    const planCard = (p) => {
      const pitch = PLAN_PITCH[p.id] || { fit: "", points: [], line: "" };
      const includes = String(p.includes || "").split("\n").map((x) => x.trim()).filter(Boolean);
      return `<section class="card${p.id === "plus" ? " opener" : ""}"><h2>${esc(p.name)}: ${money(p.monthly)}/month${p.id === "plus" ? " ⭐ most pick this" : ""}</h2>
        <p class="small muted">${p.setup ? `${money(p.setup)} setup` : t.commits.length ? `No setup fee on the ${commitWords(t)} plan` : "No setup fee"} · about ${perDay(p.monthly)} a day</p>
        ${pitch.fit ? `<p><strong>Good for:</strong> ${esc(pitch.fit)}</p>` : ""}
        ${includes.length ? `<p><strong>What they get</strong></p><ul class="list">${includes.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
        ${pitch.points.length ? `<p><strong>Why it's worth it</strong></p><ul class="list">${pitch.points.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
        ${pitch.line ? `<p class="big">“${esc(pitch.line)}”</p>` : ""}</section>`;
    };
    const ways = payWays(s, plans);
    const objections = playbookObjections(s, plans);
    $app.innerHTML = `<p><a href="#/" id="back">← Back</a></p>
      <h1>Plans & answers</h1>
      <p class="muted">What each plan gets them, why it's worth it, and what to say when they push back.</p>
      <p><a class="btn btn--primary" href="#/plans">📋 Show the customer the plans</a></p>
      <section class="card"><h2>Which plan fits?</h2><p class="small muted">Lead with the middle plan. Go down if price is the worry, up if they want it all done for them.</p>
        <ul class="list">${PLAN_QUESTIONS.map(([q, a]) => `<li>${esc(q)} → <strong>${esc(a)}</strong></li>`).join("")}</ul></section>
      ${plans.map(planCard).join("")}
      <section class="card"><h2>Ways to pay</h2><ul class="list">${ways.map(([t, d]) => `<li><strong>${esc(t)}:</strong> ${d}</li>`).join("")}</ul>
        <p class="small muted">Send the sign-up link from the call guide. They pick the plan and the way to pay, read the agreement, and pay by a secure link. Never take card numbers over the phone.</p></section>
      ${(() => { const ct = payTerms(s, true); return ct.free ? `<section class="card"><h2>⛪ Churches &amp; nonprofits</h2><ul class="list">
        <li><strong>Yearly rate:</strong> 12 months for the price of ${12 - ct.free} (${ct.free} months free), so it fits one budget line. ${plans.filter((p) => p.monthly).map((p) => `${esc(p.name)} ${money(p.monthly * (12 - ct.free))}/year`).join(" · ")}.</li>
        <li><strong>Expect a check or an invoice:</strong> many pay from the church account, not a card. Say yes to that; the owner sends the invoice.</li>
        <li><strong>Decisions take a meeting:</strong> deacons, elders, a board or the post. Leave the flyer for it, ask when it is, and set the callback for the day after.</li></ul></section>` : ""; })()}
      ${s.addons && s.addons.length ? `<section class="card"><h2>Extras</h2><p class="small muted">Offer one when it fits. Any extra goes with any plan.</p><ul class="list">${s.addons.map((a) => `<li><strong>${esc(a.name)}</strong> · ${esc(addonPrice(a))}${a.about ? `<br><span class="small">${esc(a.about)}</span>` : ""}${offerHint(a.name) ? `<br><span class="small muted">Offer to: ${esc(offerHint(a.name))}</span>` : ""}</li>`).join("")}</ul></section>` : ""}
      <section class="card"><h2>If they say…</h2>
        <label class="field">Find an answer<input id="objq" type="search" placeholder="price, contract, Facebook…" autocomplete="off"></label>
        <div id="objs">${objections.map(([q, a]) => `<details class="obj"><summary>${esc(q)}</summary><p>${a}</p></details>`).join("")}</div></section>
      <section class="card"><h2>Always</h2><ul class="list">
        <li>Be friendly and honest. Never promise rankings, customers or dates.</li>
        <li>Only text the preview link after they say it's OK.</li>
        <li>Log every call, and set a callback when they ask for one.</li>
        <li>Never take card numbers over the phone.</li></ul></section>`;
    $app.querySelector("#back").addEventListener("click", (e) => { if (history.length > 1) { e.preventDefault(); history.back(); } });
    $app.querySelector("#objq").addEventListener("input", (e) => {
      const q = e.target.value.trim().toLowerCase();
      $app.querySelectorAll("#objs details").forEach((d) => {
        const hit = !q || d.textContent.toLowerCase().includes(q);
        d.hidden = !hit;
        d.open = !!q && hit;
      });
    });
  }

  /* ---------- churches & nonprofits: everything comes from the organization (research/churches-nonprofits.md §8) ---------- */
  const CH_VARIANTS = [["church", "Church"], ["civic_post", "VFW, Legion, Lions, lodge or club"], ["charity", "Food pantry or charity"], ["community_center", "Community center"]];
  function churchEditCard(r, x, cb) {
    const v = r.variant;
    const fv = x.firstVisit || {};
    const p = x.pastor || {};
    const ta = (name, label, value, rows, ph) => `<label class="field">${label}<textarea name="${name}" rows="${rows}" placeholder="${esc(ph || "")}">${esc(value || "")}</textarea></label>`;
    const inp = (name, label, value, ph, type) => `<label class="field">${label}<input name="${name}" type="${type || "text"}" value="${esc(value || "")}" placeholder="${esc(ph || "")}"></label>`;
    const lines = (x.schedule || []).map((s) => `${s.day} | ${s.time} | ${s.label}`).join("\n");
    return `<section class="card"><h2>Church &amp; nonprofit details</h2>
      <p class="small muted">Only their own words. We never write beliefs, history or claims for them.</p>
      <label class="field">Kind of group<select name="chVariant">${CH_VARIANTS.map(([k, t]) => `<option value="${k}"${k === v ? " selected" : ""}>${t}</option>`).join("")}</select></label>
      ${v === "church" ? `${inp("chLabel", "How they describe their church <span class=\"hint\">e.g. “Missionary Baptist church”, or just “Church”</span>", x.traditionLabel)}
        ${cb("chLabelOk", "They confirmed this wording (required)", !!x.traditionConfirmed)}
        ${ta("chSchedule", "Service times, one per line: <code>Day | Time | What</code>", lines, 5, "Sunday | 9:45 AM | Sunday School\nSunday | 11:00 AM | Worship\nWednesday | 6:30 PM | Prayer & Bible Study")}
        ${cb("chScheduleOk", "They confirmed the service times (required)", !!x.scheduleConfirmed)}
        <h3>Plan a visit (their answers)</h3>
        ${inp("chParking", "Parking and which door", fv.parking)}${inp("chDress", "What people wear", fv.dress)}${inp("chKids", "Kids and nursery", fv.kids)}
        ${inp("chLength", "How long services last", fv.length)}${inp("chMusic", "Music", fv.music)}${inp("chAccess", "Accessibility", fv.accessibility)}
        <h3>Pastor</h3>
        <div class="row">${inp("chPastorName", "Name", p.name)}${inp("chPastorTitle", "Title (their words)", p.title, "Pastor, Bro., Father, Minister")}</div>
        ${ta("chPastorBio", "About them (written or approved by the church)", p.bio, 4)}
        ${cb("chPastorOff", "Leave the pastor section off", !!x.pastorOff)}
        ${ta("chBeliefs", "What we believe (their statement, word for word; optional)", x.beliefs, 4)}
        ${inp("chBeliefsUrl", "Or a link to their statement", x.beliefsUrl, "https://", "url")}
        ${inp("chGive", "Online giving link (optional)", x.givingUrl, "https://tithe.ly/…", "url")}
        ${inp("chLive", "Watch live link (YouTube or Facebook)", x.liveUrl, "https://", "url")}
        ${inp("chSermons", "Past services / sermons link", x.sermonsUrl, "https://", "url")}
        ${cb("chSpanish", "They have services in Spanish", !!x.spanish)}
        ${inp("chFacility", "Weddings & facility use (their policy)", x.facility)}` : ""}
      ${v === "charity" ? `${ta("chHelp", "Getting help: days, hours, who can come, what to bring (required)", x.help, 4)}` : ""}
      ${v === "civic_post" ? `${inp("chMeetings", "When and where they meet (required)", x.meetings, "2nd Tuesday, 6:30 PM, at the post home")}
        ${ta("chJoinText", "Who can join and how (their words)", x.joinText, 3)}${inp("chJoinUrl", "Join link (optional)", x.joinUrl, "https://", "url")}` : ""}
      ${v === "civic_post" || v === "community_center" ? inp("chHall", "Hall rental (capacity, kitchen, how to book)", x.hall) : ""}
      ${v !== "church" ? `${inp("chDonate", "Donate link", x.donateUrl, "https://", "url")}${inp("chNeeded", "Items they need", x.needed)}${inp("chVolunteer", "How to volunteer", x.volunteer)}
        ${inp("chStatus", "Nonprofit status line (their words)", x.statusText, "We're a 501(c)(3); gifts are tax-deductible.")}
        ${cb("chStatusOk", "They confirmed this status line", !!x.deductibleConfirmed)}` : ""}
    </section>`;
  }
  function churchEditValues(f) {
    const v = (n) => (f.elements[n] ? f.elements[n].value.trim() : undefined);
    const on = (n) => (f.elements[n] ? f.elements[n].checked : undefined);
    const sched = f.elements.chSchedule ? f.elements.chSchedule.value.split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((p) => p.length >= 2 && p[0]).map((p) => (p.length === 2 ? { day: p[0], time: "", label: p[1] } : { day: p[0], time: p[1], label: p.slice(2).join(" ") || p[1] })) : undefined;
    const out = {
      variant: v("chVariant"), traditionLabel: v("chLabel"), traditionConfirmed: on("chLabelOk"), schedule: sched, scheduleConfirmed: on("chScheduleOk"),
      firstVisit: f.elements.chParking ? { parking: v("chParking"), dress: v("chDress"), kids: v("chKids"), length: v("chLength"), music: v("chMusic"), accessibility: v("chAccess") } : undefined,
      pastor: f.elements.chPastorName ? { name: v("chPastorName"), title: v("chPastorTitle"), bio: f.elements.chPastorBio.value.trim() } : undefined,
      pastorOff: on("chPastorOff"), beliefs: f.elements.chBeliefs ? f.elements.chBeliefs.value.trim() : undefined, beliefsUrl: v("chBeliefsUrl"),
      givingUrl: v("chGive"), liveUrl: v("chLive"), sermonsUrl: v("chSermons"), spanish: on("chSpanish"), facility: v("chFacility"),
      help: f.elements.chHelp ? f.elements.chHelp.value.trim() : undefined, meetings: v("chMeetings"), joinText: f.elements.chJoinText ? f.elements.chJoinText.value.trim() : undefined, joinUrl: v("chJoinUrl"), hall: v("chHall"),
      donateUrl: v("chDonate"), needed: v("chNeeded"), volunteer: v("chVolunteer"), statusText: v("chStatus"), deductibleConfirmed: on("chStatusOk"),
    };
    return Object.fromEntries(Object.entries(out).filter(([, x]) => x !== undefined));
  }

  /* ---------- tax & finance: what the owner must confirm (research/tax-finance.md §5) ---------- */
  /** Financial advisors may not use testimonials or reviews (Alabama 830-X-3-.22, SEC/FINRA rules). */
  const noReviews = (l) => l.category === "finance" && (l.record ? l.record.variant : "") === "financial_advisor";
  const FIN_VARIANTS = [["tax_prep", "Tax preparation"], ["accounting", "Accounting & bookkeeping"], ["insurance", "Insurance agency"], ["financial_advisor", "Financial advisor"]];
  function financeEditCard(r, x, cb) {
    const v = r.variant;
    const modes = x.modes || [];
    const ta = (name, label, value, rows, ph) => `<label class="field">${label}<textarea name="${name}" rows="${rows}" placeholder="${esc(ph || "")}">${esc(value || "")}</textarea></label>`;
    const inp = (name, label, value, ph, type) => `<label class="field">${label}<input name="${name}" type="${type || "text"}" value="${esc(value || "")}" placeholder="${esc(ph || "")}"></label>`;
    return `<section class="card"><h2>Tax &amp; finance details</h2>
      <p class="small muted">Only what the owner tells you. Required checks block publishing until they're ticked.</p>
      <label class="field">Type of office<select name="finVariant">${FIN_VARIANTS.map(([k, t]) => `<option value="${k}"${k === v ? " selected" : ""}>${t}</option>`).join("")}</select></label>
      ${inp("finCredentials", "Credentials line <span class=\"hint\">Their exact words, e.g. “Enrolled Agent” or “Jane Smith, CPA”</span>", x.credentials)}
      ${cb("finCredentialsConfirmed", "Owner confirmed the credentials line is right", !!x.credentialsConfirmed)}
      ${v === "tax_prep" ? `${cb("finPtin", "Owner confirmed every paid preparer has a current PTIN (required)", !!x.ptinConfirmed)}
        ${cb("finEfile", "Owner confirmed they're an Authorized IRS e-file Provider (has an EFIN)", !!x.efileProvider)}
        ${inp("finOffSeason", "Hours after tax season", x.offSeason, "After April 15, Monday to Thursday 9 to 4, or by appointment")}
        ${ta("finBring", "What to bring (one per line; leave blank for the standard list)", (x.whatToBring || []).join("\n"), 5)}` : ""}
      ${v === "tax_prep" || v === "accounting" ? `${cb("finCpa", "Owner confirmed an Alabama CPA firm permit (required if “CPA” appears anywhere)", !!x.cpaPermitConfirmed)}${inp("finCpaNo", "Firm permit # (optional, shown in the footer)", x.cpaPermitNo)}` : ""}
      ${v === "insurance" ? `${cb("finIndependent", "Independent agency (works with several companies)", !!x.independent)}
        ${ta("finCarriers", "Companies they're appointed with (one per line, names only)", (x.carriers || []).join("\n"), 4)}
        ${cb("finLicenses", "Owner confirmed the agents shown are licensed in Alabama for these lines (required)", !!x.licensesConfirmed)}
        ${inp("finLicenseNo", "License # or NPN (optional, shown in the footer)", x.licenseNo)}
        ${cb("finMedicare", "They sell Medicare Advantage or Part D plans", !!x.medicare)}
        ${ta("finTpmo", "Medicare disclaimer (required if they sell Medicare plans; paste the current wording from their carrier or FMO)", x.tpmoDisclaimer, 4)}` : ""}
      ${v === "financial_advisor" ? `<p class="small"><strong>Ask first:</strong> does their firm let them use their own website? Most need compliance approval.</p>
        ${ta("finDisclosure", "Firm disclosure text (required, word for word)", x.disclosure, 5, "Securities offered through …, Member FINRA/SIPC. Advisory services offered through …")}
        <div class="row">${inp("finApprovedBy", "Compliance approved by (required)", x.complianceApprovedBy)}${inp("finApprovedOn", "Approval date", x.complianceApprovedOn, "", "date")}</div>
        ${inp("finBrokercheck", "BrokerCheck link", x.brokercheckUrl, "https://brokercheck.finra.org/…", "url")}
        ${inp("finCrs", "Form CRS link", x.crsUrl, "https://", "url")}
        <p class="small muted">Advisor sites never show reviews, ratings or testimonials.</p>` : ""}
      ${cb("finSpanish", "Se habla español", !!x.spanish)}
      <div class="row">${cb("finDrop", "Drop-off", modes.includes("drop_off"))}${cb("finInPerson", "In person", modes.includes("in_person"))}${cb("finVirtual", "Virtual", modes.includes("virtual"))}</div>
      ${inp("finPortal", "Client portal link (document upload)", x.portalUrl, "https://", "url")}
    </section>`;
  }
  function financeEditValues(f, r) {
    const v = (n) => (f.elements[n] ? f.elements[n].value.trim() : undefined);
    const on = (n) => (f.elements[n] ? f.elements[n].checked : undefined);
    const lines = (n) => (f.elements[n] ? f.elements[n].value.split("\n").map((x) => x.trim()).filter(Boolean) : undefined);
    const out = {
      variant: v("finVariant"), credentials: v("finCredentials"), credentialsConfirmed: on("finCredentialsConfirmed"),
      ptinConfirmed: on("finPtin"), efileProvider: on("finEfile"), offSeason: v("finOffSeason"), whatToBring: lines("finBring"),
      cpaPermitConfirmed: on("finCpa"), cpaPermitNo: v("finCpaNo"),
      independent: on("finIndependent"), carriers: lines("finCarriers"), licensesConfirmed: on("finLicenses"), licenseNo: v("finLicenseNo"), medicare: on("finMedicare"), tpmoDisclaimer: v("finTpmo"),
      disclosure: f.elements.finDisclosure ? f.elements.finDisclosure.value.trim() : undefined, complianceApprovedBy: v("finApprovedBy"), complianceApprovedOn: v("finApprovedOn"), brokercheckUrl: v("finBrokercheck"), crsUrl: v("finCrs"),
      spanish: on("finSpanish"), modes: [["finDrop", "drop_off"], ["finInPerson", "in_person"], ["finVirtual", "virtual"]].filter(([n]) => on(n)).map(([, m]) => m),
      portalUrl: v("finPortal"),
    };
    return Object.fromEntries(Object.entries(out).filter(([, x]) => x !== undefined));
  }

  /* ---------- in-person guide (walk-ins) ---------- */
  // The slow part of the day for each kind of business, when an owner has a few minutes.
  const WALKIN_TIMING = {
    restaurant: "Between lunch and dinner, about 2 to 4 PM. Never during a rush, at opening or right before closing.",
    salon: "A weekday mid-morning, between appointments. If they're with a client, ask when they get a break and come back.",
    contractor: "Early morning (7 to 8 AM) at the shop before crews head out, or late afternoon when they're back. Many work from a truck: call first and ask for 5 minutes.",
    auto: "Mid-morning or mid-afternoon on a weekday. Skip opening (drop-offs) and closing (pick-ups).",
    landscaping: "Early morning before crews leave, or a rainy day when they're not out. Most are on jobs midday. If there's no shop, call first.",
    cleaning: "Most cleaners work from home or are out on jobs: call first and ask to meet for 5 minutes, then bring the preview.",
    print: "Late morning or early afternoon on a weekday. Skip deadline days, like Fridays before games and events.",
    retail: "A weekday morning soon after opening, or mid-afternoon. Never during a sale or a busy Saturday.",
    church: "Tuesday to Thursday mornings during office hours. Never Sunday, never during a service, and skip Wednesday afternoons. No office? Call first and leave the flyer for the pastor. Civic posts: call the commander and ask about the monthly meeting.",
    finance: "Tax offices: May through December, when they have time to talk (never January to mid-April). Insurance agencies: a weekday mid-morning or mid-afternoon. Advisors: call first.",
  };

  // Short answers for what owners say face to face. The full list lives in Plans & answers.
  function walkinObjections(price, church) {
    if (church) return [
      ["“We'll have to take it to the deacons / the church.”", "Of course. Can I leave this for that meeting? It has a code that opens your site. When do you meet? I'll check back the day after. (Log the callback.)"],
      ["“We can't afford a monthly bill.”", `Understood. ${price}. A lot of churches pay yearly so it fits one budget line, and updates are included, so nobody has to learn a website builder.`],
      ["“A member does our Facebook.”", "Keep it! The site links to it. The site holds what Facebook buries: service times, directions, what to expect and kids. Visitors search Google first."],
      ["“Someone built us one years ago.”", "That's common, and those sites tend to break when that person moves on. We keep it running, and the domain stays in the church's name."],
      ["“Will you put our beliefs on it?”", "Only your own words, exactly as you give them. We never write beliefs or doctrine."],
      ["“People find us by word of mouth.”", "That's the best way. Newcomers and young families still look you up first, and the site makes that first visit easier."],
      ["“Not interested.”", "No problem at all. I built it for you either way. Mind if I leave this in case the church wants to look at it? (Thank them and go.)"],
    ];
    return [
      ["“I'm busy right now.”", "Totally understand, I'll get out of your way. Can I leave this with you? The code on it opens your website. When's a better time to swing back by? (Leave the flyer, log the callback.)"],
      ["“How much is it?” (before you've shown it)", `Short answer: ${price}. But let me show you what you'd get first. It takes one minute.`],
      ["“I need to think about it.”", "Of course. What's the part you want to think over, the price or whether it'll bring in business? (Answer that.) I'll text you the link so you can look tonight. Can I check back Thursday?"],
      ["“I need to talk to my husband / wife / partner.”", "Makes sense. I'll text you the link so you can show them on your phone. When's a good time for me to come back or call after you've both looked?"],
      ["“I already have a Facebook page.”", "Keep it! The site links to it. But a lot of people aren't on Facebook, and Facebook pages don't show up well on Google. This is yours and it shows up for everybody."],
      ["“We don't need it. Word of mouth keeps us busy.”", "That's the best kind of business. When someone hears about you, the first thing they do is look you up on their phone. This makes sure they find your number and hours, not the place down the road."],
      ["“Is this a scam?”", "Fair question. We're local, here in Cullman. You can see your site before paying anything, nothing goes live until you say so, and you sign up through a secure page. I never take card numbers by hand."],
      ["“Not interested.”", "No problem at all. I built it for you either way. Mind if I leave this in case you change your mind? (Thank them and go. Never push past a second no.)"],
    ];
  }

  async function viewWalkin(id) {
    setNav("home");
    const my = renderSeq;
    const l = id ? await api("/leads/" + id) : null;
    if (stale(my)) return;
    if (l && l.status !== "ready") return go("#/lead/" + id);
    const r = l ? l.record : null;
    const s = meta.settings;
    const plans = s.plans.length ? s.plans : SUGGESTED_PLANS;
    const t = payTerms(s, !!l && l.category === "church");
    const storedName = () => { try { return localStorage.getItem("wb-owner-name") || ""; } catch (e) { return ""; } };
    const me = (!isOwner() || (meta.me && meta.me.id && meta.me.id !== "owner") ? meta.me.name : s.callerName || storedName()) || "[your name]";
    const co = s.companyName || "[company name]";
    const biz = r ? r.name : "[their business]";
    // Why we're there, in their words.
    const why = !l ? `I noticed ${biz} doesn't have a website`
      : l.presence === "social" ? `I noticed ${biz} is on Facebook but doesn't have its own website`
      : l.presence === "outdated" || l.presence === "free_builder" ? `I pulled up your website on my phone and it was hard to use`
      : `I noticed ${biz} doesn't have a website`;
    const mid = plans.find((p) => p.id === "plus") || plans[Math.floor(plans.length / 2)] || plans[0];
    const cheapest = plans.reduce((a, p) => (p.monthly && (!a || p.monthly < a.monthly) ? p : a), null);
    const noSetup = t.commits.length ? ` with no setup fee on the ${commitWords(t)} plan` : "";
    const priceShort = cheapest ? `plans start at ${money(cheapest.monthly)} a month${noSetup}` : "it's a low monthly price";
    // What to point at on the preview: only things the preview really has.
    const services = r && r.services ? r.services.slice(0, 3).map((x) => x.name) : [];
    const hasHours = !!(r && r.hours && r.hours.weekly && r.hours.weekly.some((d) => d.length));
    const show = [
      "Their name up top, and the call button: “One tap and they're calling you.”",
      hasHours || !r ? "Their hours, with open or closed right now: “No more calls just to ask if you're open.”" : null,
      "The directions button: “Takes them right to your door.”",
      r && r.category === "restaurant" ? "The menu section: “Send me your menu and I'll type it in.”" : services.length ? `The services (${services.join(", ")}): “Tell me if I missed anything.”` : "The services list: “Tell me if I missed anything.”",
      "The reviews button: “Sends people to your Google reviews.”",
    ].filter(Boolean);
    const today = (() => {
      if (!hasHours) return "";
      const iv = r.hours.weekly[new Date().getDay()] || [];
      const hm = (x) => { const [h, m] = x.split(":").map(Number); const hh = h % 12 || 12; return `${hh}${m ? ":" + String(m).padStart(2, "0") : ""} ${h >= 12 && h < 24 ? "PM" : "AM"}`; };
      return iv.length ? `Open today ${iv.map((i) => `${hm(i.open)}–${hm(i.close)}`).join(", ")}` : "Closed today";
    })();
    const isChurch = !!l && l.category === "church";
    const say = (txt) => `<p class="big say">“${esc(txt)}”</p>`;
    const step = (n, title, body, opener) => `<section class="card${opener ? " opener" : ""}"><h2><span class="stepnum">${n}</span> ${title}</h2>${body}</section>`;
    const list = (items) => `<ul class="list">${items.map((x) => `<li>${x}</li>`).join("")}</ul>`;
    const questions = [
      "How do most new customers find you right now?",
      "Do people ever call just to ask your hours or where you are?",
      "Who takes care of your Facebook or Google listing?",
      r && r.category === "restaurant" ? "Do you have a menu I could snap a photo of? I'll add it to the site." : "Is that list of services right? Anything you'd add?",
      "Got a few photos of your place or your work? Real photos make a big difference.",
    ];
    $app.innerHTML = `<p><a href="${l ? `#/lead/${id}` : "#/"}" id="back">← ${l ? "Details" : "Back"}</a></p>
      <h1>In-person guide${l ? `: ${esc(biz)}` : ""}</h1>
      ${l ? `<p class="muted">${esc(l.variantLabel || CATEGORY_LABEL[l.category] || "")} · ${esc(l.reason || "")}</p>
        <p>${esc(l.address || "")}${today ? `<br><strong>${esc(today)}</strong>` : ""}</p>
        <div class="btns btns--full">
          <a class="btn btn--primary" href="#/preview/${id}">📱 Open their preview</a>
          ${r ? `<a class="btn" href="${esc(r.mapsUrl)}" target="_blank" rel="noopener">🗺️ Directions</a>` : ""}
          <button class="btn" type="button" data-flyer="${id}">🖨️ Flyer to leave</button>
        </div>
        ${contactLine(l) ? `<p>${contactLine(l)}</p>` : ""}`
        : `<p class="muted">What to say and do when you walk into a business, start to finish. Open it from a lead (or a stop on your walk-in route) and it fills in their name, what to show them and the best time to go.</p>
        <p><a class="btn btn--primary" href="#/route">🗺️ Plan a walk-in route</a></p>`}

      ${step(1, "Before you walk in", list([
        `<strong>Best time:</strong> ${l && l.bestTime ? `<strong>${esc(l.bestTime)}</strong> (what they told us). ` : ""}${esc(l ? WALKIN_TIMING[l.category] || "A slow part of their day, never during a rush." : "A slow part of their day, never during a rush. Restaurants 2 to 4 PM, shops and salons mid-morning, trades early morning.")}`,
        `Open their preview before you go in so it's loaded. Turn your brightness up and silence your phone.`,
        `Bring the printed flyer. It has a code that opens their website for 60 days, so you can leave it behind.`,
        `Look at their Google listing first: the owner's name is often in replies to reviews. Using it helps.`,
        `See a “No soliciting” sign? Don't go in. Call instead.`,
      ]))}

      ${step(2, "Walk in", `<p class="small muted">Wait until no customer needs them. Smile, keep it short.</p>
        ${say(l && l.contact ? `Hi! Is ${l.contact} around? I'll only need a minute.` : isChurch ? "Hi! Is the pastor or the church secretary in? I'll only need a minute." : "Hi! Is the owner or manager around? I'll only need a minute.")}
        ${l && l.contact ? `<p class="small"><strong>Ask for ${esc(l.contact)}.</strong></p>` : ""}
        <p class="small muted">When you have ${l && l.contact ? esc(l.contact) : isChurch ? "the pastor (or whoever handles their Facebook)" : "the owner"}:</p>
        ${say(`I'm ${me} with ${co}. We're local, here in Cullman. ${why}, so I went ahead and built you one. Can I show you real quick? It's free to look at.`)}
        ${l && l.category === "finance" && r && r.variant === "financial_advisor" ? `<p class="small"><strong>Advisors: ask this first.</strong> “Does your firm let you use your own website?” Many must use the firm's site or get compliance approval. If they can't, thank them and log it.</p>` : ""}
        ${l && l.category === "finance" && r && r.variant === "tax_prep" ? `<p class="small muted">January to mid-April is their busy season. If you're there then, keep it to one minute and offer to come back in May.</p>` : ""}
        ${isChurch ? `<p class="small muted">Churches decide together: expect “we'll take it to the deacons” (or elders, council, session). Leave the flyer for that meeting, ask when it is, and book the callback for the day after. Fall is budget season.</p>` : ""}
        <details class="obj"><summary>Owner isn't there</summary><p>“No problem. When's a good time to catch them? Could I leave this for them?” Leave the flyer, ask the owner's name and the best time, then log a callback below.</p></details>
        <details class="obj"><summary>They're slammed</summary><p>“I can see you're busy. I'll come back. Is tomorrow morning better?” Log the callback, and go.</p></details>`, true)}

      ${step(3, "Show them their website", `${list([
        "Hand them your phone <strong>folded</strong> (phone view). Let them hold it.",
        `Say: “This is what people see when they look you up on their phone.”`,
        `Point at a few things:<ul>${show.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`,
        `Then <strong>unfold</strong> it and tap Desktop view: “And here's how it looks on a computer.”`,
        "Let them scroll. <strong>Stop talking</strong> for a bit.",
      ])}
        ${say("What do you think? Anything you'd change?")}
        <p class="small muted">Anything they'd change means they're picturing it as theirs. Write it in the notes below.</p>`)}

      ${step(4, "Ask a few questions", `${list(questions.map(esc))}<p class="small muted">Their answers tell you which plan fits, and fill in what the site still needs.</p>`)}

      ${step(5, "Talk price, once they like it", `${mid ? say(`Most folks go with ${mid.name}. It's ${money(mid.monthly)} a month${noSetup}. We host it, keep it running, and make changes whenever you text us.`) : ""}
        <p class="small muted">Lead with the middle plan. Go down if price is the worry, up if they want everything done for them.</p>
        <p><a class="btn" href="${l ? `#/plans/${id}` : "#/plans"}">📋 Show them the plans</a> <a class="btn btn--small" href="#/playbook">💬 Plans & answers</a></p>`)}

      ${step(6, "Ask for the yes", `${say("Want me to get it live for you this week?")}
        ${list([
          `If yes: tap <strong>Show them the plans</strong>, let them pick, then hand them your phone. They choose how to pay, read and sign the agreement, and type their own card on the secure page.`,
          "Never write down or type in a card number for them.",
          "Once they've signed, mark them Sold below.",
        ])}`, true)}

      ${step(7, "If it's not a yes today", `${say("No pressure at all. Can I text you the link so you can look at it tonight?")}
        ${list([
          "Only text it after they say OK. It works for 14 days, no login needed.",
          "Leave the flyer either way.",
          "Set a callback for 2 or 3 days out, then follow up.",
        ])}
        ${l && l.salesStatus !== "live" ? shareButtonsHtml() : ""}`)}

      <section class="card"><h2>If they say…</h2>
        ${walkinObjections(priceShort, isChurch).map(([q, a]) => `<details class="obj"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}
        <p class="small"><a href="#/playbook">💬 All plans & common answers</a></p></section>

      <section class="card"><h2>Always</h2>${list([
        "Keep it under 5 minutes unless they keep the conversation going.",
        "Step aside when a customer walks up. Their customers come first.",
        "Be a friendly neighbor, not a salesperson. Never push past a second no.",
        "Don't knock their current site or whoever made it.",
        "Never promise rankings, more customers or a date you can't keep.",
        "Leave on good terms. Plenty of people say yes on the second visit.",
      ])}</section>

      ${l && l.salesStatus !== "live" ? signupCardHtml(l) + logCardHtml(l) : ""}`;
    $app.querySelector("#back").addEventListener("click", (e) => { if (!l && history.length > 1) { e.preventDefault(); history.back(); } });
    bindFlyer();
    if (l && l.salesStatus !== "live") {
      bindShareButtons(l);
      bindLog(l, () => go("#/lead/" + id));
      bindSignup(l, () => go("#/lead/" + id));
    }
  }

  /* ---------- Google Business Profile ---------- */
  const GBP_CHECKS = [
    ["access", "They added you as a Manager on their Google profile"],
    ["website", "Website link points to their new site"],
    ["phone", "Phone number is right"],
    ["hours", "Hours match the website (and holiday hours are set)"],
    ["category", "Main category fits what they do"],
    ["description", "Business description added"],
    ["services", "Services added"],
    ["photos", "At least 5 good photos: logo, outside, inside, their work, the team"],
    ["attributes", "Details checked (accessibility, payments, women- or veteran-owned if true)"],
    ["duplicates", "No duplicate listing on Google Maps"],
    ["reviewcards", "Review cards printed and on the counter"],
  ];

  // "Get listed everywhere" extra: the free directories worth claiming, with the same name, address, phone and hours.
  const LISTINGS = [
    ["listing_apple", "Apple Maps (Apple Business Connect)", "https://businessconnect.apple.com/"],
    ["listing_bing", "Bing Places", "https://www.bingplaces.com/"],
    ["listing_yelp", "Yelp for Business", "https://biz.yelp.com/"],
    ["listing_facebook", "Facebook page: hours, phone and website filled in", "https://www.facebook.com/"],
    ["listing_nextdoor", "Nextdoor business page", "https://business.nextdoor.com/"],
    ["listing_bbb", "Better Business Bureau", "https://www.bbb.org/get-listed"],
    ["listing_chamber", "Cullman Area Chamber of Commerce directory (if they're members)", "https://www.cullmanchamber.org/"],
  ];

  function accessSteps(l, email) {
    const name = l.record ? l.record.name : l.name;
    return `Here's how to let us manage your Google listing for ${name}. It takes a minute and you stay the owner:\n1. On your phone or computer, go to business.google.com and sign in.\n2. Open ${name}, tap the 3-dot menu, then Business Profile settings, then People and access.\n3. Tap Add, enter ${email}, choose Manager, and tap Invite.\nThat's it. We never need your password.`;
  }

  /** Happy client? Text them our Google review link. */
  function reviewAskHtml() {
    const url = meta.settings.companyReviewUrl;
    if (!url) return isOwner() ? `<section class="card"><h2>⭐ Ask for a review</h2><p class="small muted">Add your Google review link in <a href="#/settings">Settings</a> to text happy clients a review request.</p></section>` : "";
    return `<section class="card"><h2>⭐ Ask for a review</h2><p class="small muted">Once their site is live and they're happy, a quick Google review helps us win the next client.</p>
      <div class="btns btns--full"><button class="btn" type="button" data-askreview>💬 Text them our review link</button></div></section>`;
  }

  function bindReviewAsk(l) {
    const xb = $app.querySelector("[data-extraslink]");
    if (xb) xb.addEventListener("click", async () => {
      xb.disabled = true;
      try {
        const { url } = await api(`/leads/${l.id}/extraslink`, { method: "POST" });
        const name = l.record ? l.record.name : l.name;
        location.href = `sms:+1${phoneDigits(l)}?body=${encodeURIComponent(`${greeting()} Here's where you can add extras to the ${name} website, like a photo shoot, a Spanish page or social media posts: ${url}`)}`;
      } catch (err) { toast(err.message); } finally { xb.disabled = false; }
    });
    const b = $app.querySelector("[data-askreview]");
    if (!b) return;
    const name = l.record ? l.record.name : l.name;
    b.addEventListener("click", () => {
      const msg = `${greeting()} Thanks again for trusting us with the ${name} website! If you have a minute, would you leave us a quick Google review? It really helps a small local business: ${meta.settings.companyReviewUrl}`;
      location.href = `sms:+1${phoneDigits(l)}?body=${encodeURIComponent(msg)}`;
    });
  }

  function gbpCardHtml(l) {
    return `<section class="card"><h2>Google profile</h2>
      <p class="small muted">Tune up their Google listing and keep it fresh each month.</p>
      <div class="btns btns--full"><a class="btn btn--primary" href="#/gbp/${l.id}">Google, social &amp; listings tools</a></div></section>`;
  }

  async function viewGbp(id) {
    setNav("home");
    const my = renderSeq;
    const [l, g] = await Promise.all([api("/leads/" + id), api(`/leads/${id}/gbp`)]);
    if (stale(my)) return;
    const r = l.record;
    const phone = phoneDigits(l);
    const copyBtn = (text, label = "Copy") => `<button class="btn btn--small" type="button" data-copytext="${esc(text)}">${label}</button>`;
    const render = (st) => {
      if (stale(my)) return;
      const done = GBP_CHECKS.filter(([k]) => st.checks[k]).length;
      const drafts = st.posts.filter((p) => p.status === "draft");
      const social = st.social || [];
      const sDrafts = social.filter((p) => p.status === "draft");
      const sPosted = social.filter((p) => p.status === "posted").slice(-8).reverse();
      const listed = LISTINGS.filter(([k]) => st.checks[k]).length;
      const addr = r ? [r.address.street, `${r.address.city}, ${r.address.state} ${r.address.zip || ""}`.trim()].filter(Boolean).join(", ") : "";
      const posted = st.posts.filter((p) => p.status === "posted").slice(-6).reverse();
      const helper = {
        website: g.website ? `<div class="kit">${esc(g.website)} ${copyBtn(g.website)}</div>` : `<p class="small muted">Publish the site first.</p>`,
        phone: r ? `<div class="kit">${esc(r.phone.display)}</div>` : "",
        category: `<div class="kit small">${esc(l.variantLabel || "")}</div>`,
        description: st.kit
          ? `<div class="kit"><p>${esc(st.kit.description)}</p><p class="small muted">${st.kit.description.length}/750 characters${st.kit.problems.length ? ` · ⚠️ ${esc(st.kit.problems.join(", "))}: fix before pasting` : ""}</p>${copyBtn(st.kit.description)}</div>`
          : `<button class="btn btn--small" type="button" data-kit>Write description &amp; services with AI</button>`,
        services: st.kit
          ? `<div class="kit">${st.kit.services.map((x) => `<div class="svc"><strong>${esc(x.name)}</strong> ${copyBtn(x.name, "Copy name")}<p class="small">${esc(x.description)}</p>${copyBtn(x.description, "Copy description")}</div>`).join("")}</div>`
          : "",
        reviewcards: noReviews(l) ? `<p class="small muted">Not for financial advisors: no review cards or review requests.</p>` : `<div class="kit"><a class="btn btn--small" href="/api/leads/${id}/reviewcard" target="_blank" rel="noopener">Review cards (QR)</a></div>`,
      };
      $app.innerHTML = `<p><a href="#/lead/${id}">← ${esc(r ? r.name : l.name)}</a></p>
        <h1>Google profile: ${esc(r ? r.name : l.name)}</h1>
        <div class="btns btns--full" style="margin-bottom:14px">
          <a class="btn" href="https://business.google.com/" target="_blank" rel="noopener">Open Google Business Profile</a>
          <a class="btn" href="https://www.google.com/search?q=${encodeURIComponent((r ? r.name : l.name) + " " + (r ? r.address.city : ""))}" target="_blank" rel="noopener">Find them on Google</a></div>
        <p class="small muted">Signed in with your Google account as their manager, you can edit their listing from either place.</p>
        <div class="grid grid--2"><div>
        <section class="card"><h2>1. Get access</h2>
          ${g.gbpEmail
            ? `<p class="small">Text the owner these steps. They add <strong>${esc(g.gbpEmail)}</strong> as a Manager; they stay the owner and never share a password.</p>
              <div class="btns btns--full"><a class="btn btn--primary" href="sms:+1${phone}?body=${encodeURIComponent(accessSteps(l, g.gbpEmail))}">Text them the steps</a>${copyBtn(accessSteps(l, g.gbpEmail), "Copy steps")}</div>
              <p class="small muted" style="margin-top:8px">Google emails you an invite. Open it while signed in to ${esc(g.gbpEmail)} and accept.</p>`
            : `<p class="small">First add the Google account you'll use for client profiles in <a href="#/settings">Settings</a>.</p>`}
        </section>
        <section class="card"><h2>2. Tune-up <span class="chip">${done}/${GBP_CHECKS.length}</span></h2>
          <ul class="list checks">${GBP_CHECKS.map(([k, label]) => `<li><label class="check"><input type="checkbox" data-check="${k}"${st.checks[k] ? " checked" : ""}> ${esc(label)}</label>${helper[k] || ""}</li>`).join("")}</ul>
        </section></div><div>
        <section class="card"><h2>3. Monthly posts</h2>
          <p class="small muted">Pro plan: post 2–4 times a month. Paste each one into “Add update” on their profile, pick the suggested button, add a photo if you have one.</p>
          <label class="field">Anything to mention this month? <span class="hint">Specials, closures, new services. Leave blank for seasonal tips.</span><textarea id="pnotes" rows="2" maxlength="1000">${esc(st.notes || "")}</textarea></label>
          <button class="btn btn--primary" type="button" data-posts>Write 2 posts with AI</button>
          ${drafts.map((p) => `<div class="post"><div class="row"><strong>${esc(p.topic)}</strong><span class="chip" style="flex:none">${esc(p.button)}</span></div>
            <p>${esc(p.text)}</p><p class="small muted">${esc(p.month)} · ${p.text.length} characters${p.problems.length ? ` · ⚠️ ${esc(p.problems.join(", "))}` : ""}</p>
            <div class="btns">${copyBtn(p.text)}<button class="btn btn--small btn--good" type="button" data-posted="${p.id}">Mark posted</button><button class="btn btn--small" type="button" data-delpost="${p.id}">Delete</button></div></div>`).join("")}
          ${posted.length ? `<h3 style="margin-top:14px">Posted</h3><ul class="list small">${posted.map((p) => `<li>✓ ${esc(p.topic)} <span class="muted">· ${esc(p.month)}</span></li>`).join("")}</ul>` : ""}
        </section>
        <section class="card"><h2>4. Reply to a review</h2>
          <p class="small muted">Paste a new review from their profile. Copy the reply back into Google. Never offer anything in exchange for reviews.</p>
          <label class="field">The review<textarea id="rtext" rows="4" maxlength="4000"></textarea></label>
          <div class="row"><label class="field">Their name <span class="hint">optional</span><input id="rname" maxlength="80"></label>
          <label class="field">Stars<select id="rstars">${[5, 4, 3, 2, 1].map((n) => `<option value="${n}">${"★".repeat(n)}</option>`).join("")}</select></label></div>
          <button class="btn btn--primary" type="button" data-reply>Write reply</button>
          <div id="rout"></div>
        </section>
        <section class="card"><h2>5. Facebook &amp; Instagram posts</h2>
          <p class="small muted">Social media posts extra: 8–12 a month. Send them to the owner to approve, then post them (or they post them). Uses the notes box above.</p>
          <div class="btns"><button class="btn btn--primary" type="button" data-social="8">Write 8 posts with AI</button><button class="btn" type="button" data-social="4">Write 4 more</button></div>
          ${sDrafts.map((p) => `<div class="post"><strong>${esc(p.topic)}</strong>
            <p style="white-space:pre-line">${esc(p.text)}</p><p class="small muted">📷 ${esc(p.photo)} · ${esc(p.month)}${p.problems.length ? ` · ⚠️ ${esc(p.problems.join(", "))}` : ""}</p>
            <div class="btns">${copyBtn(p.text)}<button class="btn btn--small btn--good" type="button" data-posted="${p.id}">Mark posted</button><button class="btn btn--small" type="button" data-delpost="${p.id}">Delete</button></div></div>`).join("")}
          ${sDrafts.length ? `<div class="btns btns--full" style="margin-top:10px"><a class="btn" href="sms:+1${phone}?body=${encodeURIComponent(`${greeting()} Here are this month's posts for ${r ? r.name : l.name}. Reply OK or tell me what to change:\n\n${sDrafts.map((p, i) => `${i + 1}. ${p.text}`).join("\n\n")}`)}">Text the drafts to the owner to approve</a></div>` : ""}
          ${sPosted.length ? `<h3 style="margin-top:14px">Posted</h3><ul class="list small">${sPosted.map((p) => `<li>✓ ${esc(p.topic)} <span class="muted">· ${esc(p.month)}</span></li>`).join("")}</ul>` : ""}
        </section>
        <section class="card"><h2>6. Listed everywhere <span class="chip">${listed}/${LISTINGS.length}</span></h2>
          <p class="small muted">Get listed everywhere extra. Use exactly the same name, address, phone and hours on every one.</p>
          ${r ? `<div class="kit small">${esc(r.name)} ${copyBtn(r.name)}<br>${esc(addr)} ${copyBtn(addr)}<br>${esc(r.phone.display)} ${copyBtn(r.phone.display)}${g.website ? `<br>${esc(g.website)} ${copyBtn(g.website)}` : ""}</div>` : ""}
          <ul class="list checks">${LISTINGS.map(([k, label, href]) => `<li><label class="check"><input type="checkbox" data-check="${k}"${st.checks[k] ? " checked" : ""}> ${esc(label)}</label> <a class="small" href="${href}" target="_blank" rel="noopener">Open</a></li>`).join("")}</ul>
        </section></div></div>`;
      bind();
    };
    const bind = () => {
      $app.querySelectorAll("[data-copytext]").forEach((b) => b.addEventListener("click", async () => {
        try { await navigator.clipboard.writeText(b.dataset.copytext); toast("Copied"); } catch (e) { toast("Couldn't copy"); }
      }));
      $app.querySelectorAll("[data-check]").forEach((c) => c.addEventListener("change", async () => {
        try { Object.assign(g, await api(`/leads/${id}/gbp`, { method: "PUT", json: { check: c.dataset.check, done: c.checked } })); render(g); } catch (err) { toast(err.message); }
      }));
      const busy = async (btn, label, fn) => {
        btn.disabled = true;
        const old = btn.innerHTML;
        btn.innerHTML = `<span class="spin"></span> ${label}`;
        try { await fn(); } catch (err) { toast(err.message); btn.disabled = false; btn.innerHTML = old; }
      };
      const kitBtn = $app.querySelector("[data-kit]");
      if (kitBtn) kitBtn.addEventListener("click", () => busy(kitBtn, "Writing… (about 15 seconds)", async () => { Object.assign(g, await api(`/leads/${id}/gbp/kit`, { method: "POST" })); render(g); }));
      const postsBtn = $app.querySelector("[data-posts]");
      postsBtn.addEventListener("click", () => busy(postsBtn, "Writing posts…", async () => {
        Object.assign(g, await api(`/leads/${id}/gbp/posts`, { method: "POST", json: { count: 2, notes: $app.querySelector("#pnotes").value.trim() } }));
        render(g);
      }));
      $app.querySelectorAll("[data-posted],[data-delpost]").forEach((b) => b.addEventListener("click", async () => {
        const postId = b.dataset.posted || b.dataset.delpost;
        if (b.dataset.delpost && !confirm("Delete this draft?")) return;
        try { Object.assign(g, await api(`/leads/${id}/gbp`, { method: "PUT", json: b.dataset.posted ? { postId, posted: true } : { postId, removePost: true } })); render(g); } catch (err) { toast(err.message); }
      }));
      $app.querySelectorAll("[data-social]").forEach((b) => b.addEventListener("click", () => busy(b, "Writing posts… (about 30 seconds)", async () => {
        Object.assign(g, await api(`/leads/${id}/gbp/social`, { method: "POST", json: { count: Number(b.dataset.social), notes: $app.querySelector("#pnotes").value.trim() } }));
        render(g);
      })));
      const replyBtn = $app.querySelector("[data-reply]");
      replyBtn.addEventListener("click", () => {
        const review = $app.querySelector("#rtext").value.trim();
        if (!review) return toast("Paste the review first");
        busy(replyBtn, "Writing…", async () => {
          const res = await api(`/leads/${id}/gbp/reply`, { method: "POST", json: { review, stars: Number($app.querySelector("#rstars").value), reviewer: $app.querySelector("#rname").value.trim() || undefined } });
          const out = $app.querySelector("#rout");
          out.innerHTML = `<div class="kit" style="margin-top:12px"><p>${esc(res.reply)}</p>${res.problems.length ? `<p class="small muted">⚠️ ${esc(res.problems.join(", "))}</p>` : ""}<button class="btn btn--small" type="button" id="rcopy">Copy reply</button></div>`;
          out.querySelector("#rcopy").addEventListener("click", async () => { try { await navigator.clipboard.writeText(res.reply); toast("Copied"); } catch (e) { toast("Couldn't copy"); } });
          replyBtn.disabled = false;
          replyBtn.textContent = "Write another version";
        });
      });
    };
    render(g);
  }

  /* ---------- add a business by hand ---------- */
  const PACKS = [["restaurant", "Restaurant, cafe, bakery or food truck"], ["contractor", "Contractor or home service (plumbing, HVAC, painting, concrete, tree, pest…)"], ["salon", "Salon, barber, nails, massage or pet grooming"], ["auto", "Auto repair, body shop, detailing, towing or small engine"], ["landscaping", "Landscaping or lawn care"], ["cleaning", "Cleaning or pressure washing"], ["finance", "Tax preparer, accountant, insurance agency or financial advisor"], ["church", "Church, VFW/Legion/Lions/lodge, food pantry or community center"], ["print", "Print shop, sign shop, screen printing or embroidery"], ["retail", "Shop: boutique, gifts, florist, antiques, thrift, feed or furniture"]];
  const PRESENCE = { none: ["No website", "chip--good"], social: ["Only a social page", "chip--good"], free_builder: ["Free-builder site", "chip--warn"], outdated: ["Outdated website", "chip--warn"], has_site: ["Has a website", "chip--warn"] };

  async function viewAdd() {
    setNav("home");
    $app.innerHTML = `<p><a href="#/">← Leads</a></p><h1>Add a business</h1>
      <p class="muted small">Found a business on a call, a drive or a tip? Look it up on Google and build its site, just like a run.</p>
      <form id="sq" class="card"><label class="field">Business name <span class="hint">Add the town if it's not in Cullman, e.g. “Smith Plumbing Hartselle”</span>
        <input name="q" required minlength="3" maxlength="120" autocomplete="off" placeholder="e.g. Rusty's Diner"></label>
        <button class="btn btn--primary" type="submit">Search Google</button></form>
      <ul class="list" id="results"></ul>
      <section class="card small muted"><strong>Not on Google?</strong> Their website needs Google's details (hours, map, reviews), so they need a Google Business Profile first. That's your Google profile setup extra. Once their listing is live, search for it here.</section>`;
    const list = $app.querySelector("#results");
    $app.querySelector("#sq").addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector("button");
      btn.disabled = true;
      list.innerHTML = `<li class="card"><span class="spin"></span> Searching…</li>`;
      try {
        const { results } = await api("/places/search?q=" + encodeURIComponent(e.target.q.value.trim()));
        if (!list.isConnected) return;
        list.innerHTML = results.length
          ? results.map((x, i) => {
              const [plabel, pcls] = PRESENCE[x.presence] || ["", ""];
              const warn = [!x.open ? "Google lists it as closed" : "", x.chain ? "Looks like a chain" : "", !x.phone ? "No phone number on Google: type it in below (from their sign, Facebook or the owner)" : ""].filter(Boolean);
              return `<li class="card lead"><div class="lead__top"><strong class="lead__name">${esc(x.name)}</strong>${plabel ? `<span class="chip ${pcls}" style="flex:none">${plabel}</span>` : ""}</div>
                <div class="lead__meta">${esc(x.type || "")}${x.rating ? ` · <span class="stars">★ ${x.rating.toFixed(1)}</span> (${x.reviews})` : ""}</div>
                <div class="lead__meta">${esc(x.address)}${x.phone ? ` · ${esc(x.phone)}` : ""}</div>
                ${x.website && x.presence !== "none" ? `<div class="lead__meta small">Website: ${esc(x.website.replace(/^https?:\/\//, "").slice(0, 60))}</div>` : ""}
                ${warn.length ? `<p class="small" style="color:var(--warn);margin:0">⚠️ ${esc(warn.join(" · "))}</p>` : ""}
                ${x.existing
                  ? `<div class="btns"><a class="btn btn--small" href="#/lead/${x.existing.id}">Already in your leads: open it</a></div>`
                  : `
                    ${x.phone ? "" : `<label class="field" style="margin:0">Their phone number<input type="tel" inputmode="tel" autocomplete="off" data-phone="${i}" placeholder="(256) 555-0123"></label>`}<label class="field" style="margin:0"><span class="sr-only">Kind of business</span><select data-cat="${i}">${x.category ? "" : `<option value="">Pick the kind of business…</option>`}${PACKS.map(([k, t]) => `<option value="${k}"${k === x.category ? " selected" : ""}>${t}</option>`).join("")}</select></label>
                      <div class="btns btns--full"><button class="btn btn--primary" type="button" data-add="${i}">Add &amp; build site</button></div>`
                    }</li>`;
            }).join("")
          : `<li class="card muted">No matches. Try the exact name from their sign, or add the town.</li>`;
        list.querySelectorAll("[data-add]").forEach((b) => b.addEventListener("click", async () => {
          const x = results[Number(b.dataset.add)];
          const category = list.querySelector(`[data-cat="${b.dataset.add}"]`).value;
          if (!category) return toast("Pick the kind of business first");
          const phoneInput = list.querySelector(`[data-phone="${b.dataset.add}"]`);
          const phone = phoneInput ? phoneInput.value.trim() : undefined;
          if (phoneInput && phone.replace(/\D/g, "").length < 10) { phoneInput.focus(); return toast("Type their phone number first"); }
          b.disabled = true;
          b.innerHTML = '<span class="spin"></span> Adding…';
          try {
            const res = await api("/leads/add", { method: "POST", json: { placeId: x.placeId, category, phone } });
            toast(res.existed ? "It's already in your leads" : "Added! Building the site now (about a minute).");
            go("#/lead/" + res.id);
          } catch (err) { toast(err.message); b.disabled = false; b.textContent = "Add & build site"; }
        }));
      } catch (err) { list.innerHTML = ""; toast(err.message); } finally { btn.disabled = false; }
    });
    $app.querySelector("[name=q]").focus();
  }

  /* ---------- walk-in route ---------- */
  const START_TOWNS = [["Cullman", 34.1748, -86.8436], ["Hartselle", 34.4434, -86.9353], ["Arab", 34.3281, -86.4958], ["Hanceville", 34.0607, -86.7675], ["Good Hope", 34.1157, -86.8636], ["Vinemont", 34.2465, -86.8661]];
  const MAX_STOPS = 9; // Google Maps directions links take up to 9 stops
  const miles = (a, b) => {
    const r = (d) => (d * Math.PI) / 180;
    const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
    return 2 * 3958.8 * Math.asin(Math.sqrt(h));
  };

  async function viewRoute() {
    setNav("home");
    const my = renderSeq;
    const { leads } = await api("/leads");
    if (stale(my)) return;
    const pool = leads.filter((l) => l.lat && l.status === "ready" && (l.salesStatus === "new" || l.salesStatus === "shown"));
    const picked = new Set();
    let start = { lat: START_TOWNS[0][1], lng: START_TOWNS[0][2], label: "Cullman" };
    let category = "";
    $app.innerHTML = `<p><a href="#/">← Leads</a></p><h1>Walk-in route</h1>
      <p class="muted small">Pick up to ${MAX_STOPS} businesses, then open the route in Google Maps. Show them their preview on your phone when you walk in.</p>
      <section class="card"><div class="row" style="flex-wrap:wrap">
        <label class="field" style="flex:1 1 160px">Start from<select id="from"><option value="me">📍 Where I am now</option>${START_TOWNS.map(([n], i) => `<option value="${i}"${i === 0 ? " selected" : ""}>${n}</option>`).join("")}</select></label>
        <label class="field" style="flex:1 1 160px">Category<select id="cat"><option value="">All</option>${Object.entries(CATEGORY_LABEL).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></label></div></section>
      <ul class="list" id="stops"></ul>
      <div class="sticky-save btns btns--full"><a class="btn btn--primary" id="go" target="_blank" rel="noopener">Open route</a><button class="btn" id="clear" type="button">Clear</button></div>`;
    const list = $app.querySelector("#stops");
    const goBtn = $app.querySelector("#go");
    const order = () => {
      // Nearest stop next, starting from the start point.
      const left = pool.filter((l) => picked.has(l.id));
      const out = [];
      let here = start;
      while (left.length) {
        left.sort((a, b) => miles(here, a) - miles(here, b));
        here = left.shift();
        out.push(here);
      }
      return out;
    };
    const update = () => {
      const stops = order();
      goBtn.textContent = stops.length ? `Open route (${stops.length} stop${stops.length > 1 ? "s" : ""})` : "Open route";
      goBtn.classList.toggle("is-disabled", !stops.length);
      if (!stops.length) { goBtn.removeAttribute("href"); return; }
      const last = stops[stops.length - 1];
      const mid = stops.slice(0, -1);
      const q = new URLSearchParams({ api: "1", origin: `${start.lat},${start.lng}`, destination: last.address || `${last.lat},${last.lng}`, destination_place_id: last.placeId, travelmode: "driving" });
      if (mid.length) {
        q.set("waypoints", mid.map((l) => l.address || `${l.lat},${l.lng}`).join("|"));
        q.set("waypoint_place_ids", mid.map((l) => l.placeId).join("|"));
      }
      goBtn.href = "https://www.google.com/maps/dir/?" + q;
      list.querySelectorAll("input[data-pick]").forEach((c) => { c.disabled = !c.checked && picked.size >= MAX_STOPS; });
    };
    const render = () => {
      const shown = pool.filter((l) => !category || l.category === category).map((l) => ({ l, d: miles(start, l) })).sort((a, b) => a.d - b.d).slice(0, 60);
      list.innerHTML = shown.length
        ? shown.map(({ l, d }) => `<li><label class="pickrow"><input type="checkbox" data-pick="${l.id}"${picked.has(l.id) ? " checked" : ""}>
            <span style="flex:1"><span class="row" style="align-items:baseline"><strong>${esc(l.name)}</strong><span class="dist" style="flex:none">${d.toFixed(1)} mi</span></span>
            <span class="small muted">${esc(CATEGORY_LABEL[l.category] || l.category)} · ${esc(l.reason || "")}</span><br><span class="small">${esc(l.address || "")}</span>
            ${l.followUp ? `<br>${followChip(l.followUp)}` : ""}</span></label>
            <div class="btns" style="margin:6px 0 0 36px"><a class="btn btn--small btn--primary" href="#/walkin/${l.id}">🚶 Guide</a><a class="btn btn--small" href="#/preview/${l.id}">Preview</a><button class="btn btn--small" type="button" data-flyer="${l.id}">Flyer</button></div></li>`).join("")
        : `<li class="muted">No open leads with a location${category ? " in this category" : ""}.</li>`;
      list.querySelectorAll("input[data-pick]").forEach((c) => c.addEventListener("change", () => {
        if (c.checked) picked.add(c.dataset.pick); else picked.delete(c.dataset.pick);
        update();
      }));
      bindFlyer();
      update();
    };
    $app.querySelector("#cat").addEventListener("change", (e) => { category = e.target.value; render(); });
    $app.querySelector("#clear").addEventListener("click", () => { picked.clear(); render(); });
    $app.querySelector("#from").addEventListener("change", (e) => {
      const v = e.target.value;
      if (v !== "me") { const t = START_TOWNS[Number(v)]; start = { lat: t[1], lng: t[2], label: t[0] }; render(); return; }
      if (!navigator.geolocation) return toast("Location isn't available here. Pick a town instead.");
      toast("Finding you…");
      navigator.geolocation.getCurrentPosition(
        (pos) => { start = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: "You" }; render(); },
        () => { toast("Couldn't get your location. Pick the nearest town instead."); e.target.value = "0"; },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
      );
    });
    render();
  }

  /* ---------- sales ---------- */
  async function viewSales() {
    setNav("sales");
    const my = renderSeq;
    const d = await api("/sales");
    if (stale(my)) return;
    const plusPlan = (meta.settings.plans || []).find((p) => p.id === "plus") || SUGGESTED_PLANS[1];
    const pipe = d.pipeline;
    const lost = d.lostReasons || {};
    const lostTotal = Object.values(lost).reduce((a, b) => a + (Number(b) || 0), 0);
    const table = (rows) => rows.length
      ? `<table class="stats"><thead><tr><th>Who</th><th>Calls</th><th>Reached</th><th>Interested</th><th>Sold</th></tr></thead><tbody>${rows
          .map((r) => `<tr><th scope="row">${esc(r.person)}</th><td>${r.calls}</td><td>${r.reached}</td><td>${r.interested}</td><td><strong>${r.sold}</strong></td></tr>`).join("")}</tbody></table>`
      : `<p class="muted small">No calls logged yet.</p>`;
    $app.innerHTML = `<h1>Sales</h1>
      <div class="grid grid--2">
        <section class="card"><h2>Monthly revenue</h2><p class="bignum">${money(d.monthlyRevenue)}<span class="small muted"> / month paid</span></p>
          <p class="small muted">${money(d.signedRevenue)}/month signed in total · ${d.clients.length} client${d.clients.length === 1 ? "" : "s"}. Mark a sign-up as paid on the lead once their payment is set up.</p></section>
        <section class="card"><h2>Commission this month</h2>${d.commission
          ? d.commissionOwed.length ? `<ul class="list">${d.commissionOwed.map((c) => `<li><strong>${esc(c.person)}</strong>: ${c.sales} sale${c.sales === 1 ? "" : "s"} × ${money(d.commission)} = <strong>${money(c.amount)}</strong></li>`).join("")}</ul>` : `<p class="muted small">No caller sales yet this month.</p>`
          : `<p class="muted small">Set a commission per sale in <a href="#/settings">Settings</a>.</p>`}</section>
        <section class="card"><h2>This week</h2>${table(d.week)}</section>
        <section class="card"><h2>This month</h2>${table(d.month)}</section>
        ${pipe ? `<section class="card"><h2>In the pipeline</h2><p class="bignum">${money(pipe.monthlyIfPlus ?? pipe.shown * plusPlan.monthly)}<span class="small muted"> / month if they all buy ${esc(plusPlan.name)}</span></p>
          <p class="small muted">${pipe.shown} lead${pipe.shown === 1 ? "" : "s"} shown × ${money(plusPlan.monthly)} (${esc(plusPlan.name)}).</p></section>` : ""}
        ${lostTotal ? `<section class="card"><h2>Why they said no</h2><div class="chips">${LOST_REASONS.map(([k, t]) => (lost[k] ? `<span class="chip">${esc(t)} <strong>${lost[k]}</strong></span>` : "")).join("")}</div>
          <p class="small muted" style="margin:8px 0 0">From the reason picked when logging Not interested.</p></section>` : ""}
      </div>
      <section class="card"><h2>Clients</h2>${d.clients.length
        ? `<ul class="list">${d.clients.map((c) => `<li><div class="row"><a href="#/lead/${c.id}"><strong>${esc(c.name)}</strong></a>${c.status === "live" ? '<span class="chip chip--good" style="flex:none">● Live</span>' : '<span class="chip" style="flex:none">Sold</span>'}</div>
            <p class="small muted" style="margin:4px 0 0">${c.plan ? `${esc(c.plan)} · ${money(c.monthly)}/mo · ${c.paid ? "paid" : "<strong>payment not set up</strong>"}` : "No sign-up on file"}${c.seller ? ` · sold by ${esc(c.seller)}` : ""}</p>
            <div class="btns" style="margin-top:6px"><button class="btn btn--small" type="button" data-portal="${c.id}">💳 Billing portal</button></div></li>`).join("")}</ul>`
        : `<p class="muted small">No clients yet. They show up here once someone signs up or is marked Sold.</p>`}</section>
      <section class="card"><h2>🛒 Website orders</h2>${(d.websiteOrders || []).length
        ? `<ul class="list">${d.websiteOrders.map((o) => `<li><div class="row"><strong>${esc(o.business || "")}</strong>${o.paid ? '<span class="chip chip--good" style="flex:none">Paid</span>' : '<span class="chip chip--warn" style="flex:none">Not paid</span>'}</div>
            <p class="small" style="margin:4px 0 0">${esc(o.plan)}${o.extras.length ? ` + ${esc(o.extras.join(", "))}` : ""} · ${money((o.dueCents || 0) / 100)} due</p>
            <p class="small muted" style="margin:2px 0 0">${esc(o.name)} · <a href="${telHref(String(o.phone || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, ""))}">${esc(o.phone || "")}</a> · ${esc(o.email || "")} · ${ago(o.createdAt)} · <a href="/api/agreements/s/${o.id}" target="_blank" rel="noopener">📄 agreement</a></p></li>`).join("")}</ul>
           <p class="small muted">People who bought from “Get started” on your website. Find their business with <a href="#/add">➕ Add a business</a> to build their site.</p>`
        : `<p class="muted small">None yet. People who buy from “Get started” on your website show up here.</p>`}</section>
      <p class="small muted">Calls are logged outcomes. Reached means someone answered. A sale counts for whoever sent the sign-up link, or whoever marked it Sold.</p>`;
    $app.querySelectorAll("[data-portal]").forEach((b) => b.addEventListener("click", async () => {
      b.disabled = true;
      try { await openPortal(b.dataset.portal); } catch (err) { toast(err.message); } finally { b.disabled = false; }
    }));
  }

  /* ---------- inbox ---------- */
  async function viewInbox() {
    setNav("inbox");
    const my = renderSeq;
    const { items } = await api("/inbox");
    if (stale(my)) return;
    document.getElementById("inbox-dot").hidden = !items.some((i) => !i.read);
    $app.innerHTML = `<h1>Inbox</h1><p class="muted">Requests customers send through your clients' live websites.</p>
      <ul class="list">${items.length ? items.map((i) => `<li class="card"><div class="lead__top"><strong>${esc(i.data.name)}</strong>${i.read ? "" : '<span class="chip chip--warn">New</span>'}</div>
        <p class="small muted">For ${esc(i.business || "a client")} · ${ago(i.createdAt)}</p>
        ${i.data.service ? `<p>${esc(i.data.service)}${i.data.town ? " · " + esc(i.data.town) : ""}</p>` : ""}
        ${i.data.message ? `<p style="white-space:pre-line">${esc(i.data.message)}</p>` : ""}
        <div class="btns"><a class="btn btn--small btn--primary" href="${telHref(i.data.phone)}">📞 ${esc(i.data.phone)}</a>
        ${i.data.email ? `<a class="btn btn--small" href="mailto:${esc(i.data.email)}">Email</a>` : ""}
        ${i.leadId && i.leadId !== "company" ? `<a class="btn btn--small" href="#/lead/${esc(i.leadId)}">Open client</a>` : ""}
        ${i.read ? "" : `<button class="btn btn--small" data-read="${i.id}">Mark read</button>`}</div></li>`).join("") : '<li class="card muted">No requests yet. They show up here once a client site is live.</li>'}</ul>`;
    $app.querySelectorAll("[data-read]").forEach((b) => b.addEventListener("click", async () => { await api(`/inbox/${b.dataset.read}/read`, { method: "POST" }); viewInbox(); }));
  }

  /* ---------- settings ---------- */
  function deviceCard() {
    return `<section class="card"><h2>This device</h2>
      ${meta.me ? `<p class="muted small">Logged in as <strong>${esc(meta.me.name)}</strong>${isOwner() ? "" : " (caller)"}</p>` : ""}
      <div class="btns">
        <button class="btn" id="install"${installPrompt ? "" : " hidden"}>Install app</button>
        <button class="btn btn--danger" id="logout">Log out</button></div>
        <p class="small muted">${installPrompt ? "" : "Using the Android app? You're all set. In a browser: open the menu (⋮) and tap “Add to Home screen”."}</p></section>
      <section class="card"><h2>Android app</h2>
        <p class="small muted">Install the app on an Android phone. After downloading, open the file and allow installing from this source if asked. Log in once in the app with the same password.</p>
        <a class="btn" href="/api/android.apk" download>Download Android app</a></section>`;
  }

  function bindDevice() {
    $app.querySelector("#logout").addEventListener("click", async () => { await api("/auth/logout", { method: "POST" }); meta = null; go("#/login"); });
    const inst = $app.querySelector("#install");
    inst.addEventListener("click", async () => { if (!installPrompt) return; installPrompt.prompt(); installPrompt = null; inst.hidden = true; });
  }

  function callersCard(callers) {
    return `<section class="card"><h2>Team</h2>
      <p class="small muted"><strong>Callers</strong> can see leads, previews and call guides, text preview links, log calls and set callbacks. They can't run searches, edit or publish sites, delete leads, or see settings, spending or the inbox.<br><strong>Full access</strong> can do everything you can, under their own name.</p>
      <ul class="list">${callers.length ? callers.map((c) => `<li><div class="row"><strong>${esc(c.name)}</strong><span class="chip${c.admin ? " chip--good" : ""}" style="flex:none">${c.admin ? "Full access" : "Caller"}</span>${c.disabled ? `<span class="chip" style="flex:none">Turned off</span>` : ""}</div>
        <div class="btns" style="margin-top:6px">
          <button class="btn btn--small" data-cpass="${c.id}">New password</button>
          ${c.id === meta.me.id ? "" : `<button class="btn btn--small" data-cadmin="${c.id}" data-admin="${c.admin ? 1 : 0}">${c.admin ? "Make caller" : "Give full access"}</button>`}
          <button class="btn btn--small" data-ctoggle="${c.id}" data-off="${c.disabled ? 1 : 0}">${c.disabled ? "Turn on" : "Turn off"}</button>
          <button class="btn btn--small btn--danger" data-cdel="${c.id}">Remove</button></div></li>`).join("") : `<li class="muted small">No callers yet.</li>`}</ul>
      <div style="margin-top:12px"><h3>Backup</h3><p class="small muted">A copy of your leads, notes, sign-ups and settings as a file. Keep it somewhere safe now and then.</p>
        <a class="btn btn--small" href="/api/backup" download="website-business-backup.json">⬇️ Download backup</a></div>
      <form id="cf" style="margin-top:12px"><h3>Add someone</h3>
        <label class="field">Their name<input name="name" maxlength="60" required placeholder="Used in texts, call guides and notes"></label>
        <label class="field">Their password <span class="hint">At least 8 characters, different from everyone else's. Tell them in person.</span><input name="password" type="text" minlength="8" autocomplete="off" required></label>
        <label class="check"><input type="checkbox" name="admin"> Full access (can do everything you can)</label>
        <button class="btn btn--primary" type="submit">Add</button></form></section>`;
  }

  function bindCallers() {
    $app.querySelector("#cf").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target;
      try {
        await api("/callers", { method: "POST", json: { name: f.name.value.trim(), password: f.password.value, admin: f.admin.checked } });
        toast("Added. They log in with that password.");
        viewSettings();
      } catch (err) { toast(err.message); }
    });
    $app.querySelectorAll("[data-cpass]").forEach((b) => b.addEventListener("click", async () => {
      const password = prompt("New password for this caller (at least 8 characters). They'll be logged out everywhere.");
      if (!password) return;
      try { await api(`/callers/${b.dataset.cpass}`, { method: "PUT", json: { password } }); toast("Password changed"); } catch (err) { toast(err.message); }
    }));
    $app.querySelectorAll("[data-cadmin]").forEach((b) => b.addEventListener("click", async () => {
      const giving = b.dataset.admin !== "1";
      if (giving && !confirm("Give full access? They'll be able to do everything you can, including settings and publishing.")) return;
      try { await api(`/callers/${b.dataset.cadmin}`, { method: "PUT", json: { admin: giving } }); viewSettings(); } catch (err) { toast(err.message); }
    }));
    $app.querySelectorAll("[data-ctoggle]").forEach((b) => b.addEventListener("click", async () => {
      if (b.dataset.off !== "1" && !confirm("Turn this person off? They'll be logged out everywhere and can't log in until you turn them back on. Their notes stay.")) return;
      try { await api(`/callers/${b.dataset.ctoggle}`, { method: "PUT", json: { disabled: b.dataset.off !== "1" } }); viewSettings(); } catch (err) { toast(err.message); }
    }));
    $app.querySelectorAll("[data-cdel]").forEach((b) => b.addEventListener("click", async () => {
      if (!confirm("Remove this person? Their notes stay.")) return;
      try { await api(`/callers/${b.dataset.cdel}`, { method: "DELETE" }); viewSettings(); } catch (err) { toast(err.message); }
    }));
  }

  const PLAN_IDS = ["basic", "plus", "pro"];
  // Priced from market research (Oct 2026): pay-monthly website services charge $78-150/mo, Hibu $99-159/mo,
  // Google Business Profile management $100-400/mo on its own.
  const SUGGESTED_PLANS = [
    { id: "basic", name: "Basic", setup: 0, monthly: 49, includes: "Your website on fast, secure hosting\nSmall text, hours and photo updates\nTap-to-call and directions on every page" },
    { id: "plus", name: "Plus", setup: 0, monthly: 89, includes: "Everything in Basic\nMonthly visitor report by text\nGoogle Business Profile tune-up\nGoogle review QR cards for your counter" },
    { id: "pro", name: "Pro", setup: 0, monthly: 149, includes: "Everything in Plus\nMonthly Google profile posts and photo updates\nYour own domain name\nBusiness email (info@yourbusiness.com): free forwarding to the email you already use, or a full Google mailbox we set up, billed to you by Google\nPriority changes" },
  ];
  const UNIT_LABEL = { month: "/month", each: " each", "one-time": " one-time", quote: " (priced per job)" };
  const addonPrice = (a) => (a.unit === "quote" ? "Priced per job" : `${money(a.price)}${UNIT_LABEL[a.unit] || ""}`);

  // Playbook: when a caller should bring each extra up (matched on the extra's name).
  const OFFER_HINT = [
    [/order|book/i, "Restaurants, salons and groomers that already use Square, Toast, DoorDash, Booksy or Calendly."],
    [/listed/i, "Anyone. Ask: “Do you show up on Apple Maps?” Most small shops don't."],
    [/google business/i, "Anyone whose Google listing has old hours, few photos or no description."],
    [/photo/i, "Anyone with no photos, or only Google's. Their site looks twice as good."],
    [/spanish/i, "Mexican restaurants, landscapers, cleaners and shops with Spanish-speaking customers."],
    [/hiring/i, "Restaurants and trades that are hiring. Look for “Now hiring” on their Facebook."],
    [/rush/i, "Grand openings, busy season, or an event coming up."],
    [/social/i, "Busy owners whose Facebook hasn't posted in months."],
    [/table|window/i, "Restaurants (table tents), shops and salons (counter and window)."],
    [/cards|yard|door/i, "Trades (yard signs, door hangers) and anyone out of business cards."],
    [/logo/i, "No logo, or a blurry one on their Facebook."],
    [/review card|nfc/i, "Busy counters: restaurants, salons, shops. More reviews, higher on Maps."],
    [/changes/i, "Bigger jobs beyond the plan: a new page or section, a redesign."],
    [/ads?\b|ad management/i, "Contractors in busy season; restaurants with a new menu or event."],
  ];
  const offerHint = (name) => (OFFER_HINT.find(([re]) => re.test(name)) || [null, ""])[1];

  function planRows(plans) {
    const list = plans.length ? PLAN_IDS.map((id) => plans.find((p) => p.id === id) || { id, name: "", setup: 0, monthly: "", includes: "" }) : SUGGESTED_PLANS;
    return list.map((p) => `<fieldset class="plan"><legend>${p.id === "basic" ? "Plan 1" : p.id === "plus" ? "Plan 2 (recommended)" : "Plan 3"}</legend>
      <div class="row"><label class="field">Name<input name="plan_${p.id}_name" value="${esc(p.name)}" maxlength="40"></label>
      <label class="field">Monthly ($)<input name="plan_${p.id}_monthly" type="number" min="0" inputmode="decimal" value="${p.monthly}"></label>
      <label class="field">Setup ($) <span class="hint">Keep 0; month to month adds its own fee</span><input name="plan_${p.id}_setup" type="number" min="0" inputmode="decimal" value="${p.setup || 0}"></label></div>
      <label class="field">What's included <span class="hint">One per line</span><textarea name="plan_${p.id}_includes" rows="3">${esc(p.includes)}</textarea></label>
      <label class="field">Monthly payment link <span class="hint">Monthly subscription, Stripe or Square. Used for 12-month and 6-month plans</span><input name="plan_${p.id}_pay" type="url" value="${esc(p.payLink || "")}" placeholder="https://buy.stripe.com/…"></label>
      <details class="more"><summary>Links for 6-month, month-to-month and yearly (optional)</summary>
        <label class="field">6-month plan link <span class="hint">Leave empty to use the 12-month link (same monthly price)</span><input name="plan_${p.id}_payshort" type="url" value="${esc(p.payLinkShort || "")}" placeholder="https://buy.stripe.com/…"></label>
        <label class="field">Month-to-month link <span class="hint">Includes the extra setup fee</span><input name="plan_${p.id}_payflex" type="url" value="${esc(p.payLinkFlex || "")}" placeholder="https://buy.stripe.com/…"></label>
        <label class="field">Yearly link<input name="plan_${p.id}_payannual" type="url" value="${esc(p.payLinkAnnual || "")}" placeholder="https://buy.stripe.com/…"></label>
        <p class="small muted">Without these, clients who pick those options are told you'll send an invoice.</p></details></fieldset>`).join("");
  }

  async function viewSettings() {
    setNav("settings");
    const my = renderSeq;
    meta = await api("/meta");
    if (stale(my)) return;
    if (!isOwner()) {
      $app.innerHTML = `<h1>Settings</h1><div class="grid grid--2">${deviceCard()}</div>`;
      return bindDevice();
    }
    const [{ last30Days: u }, { callers }] = await Promise.all([api("/usage"), api("/callers")]);
    if (stale(my)) return;
    const s = meta.settings;
    $app.innerHTML = `<h1>Settings</h1><div class="grid grid--2">
      <form id="sf" class="card settings-form"><h2>Your business</h2>
        <label class="field">Company name <span class="hint">What clients see</span><input name="companyName" value="${esc(s.companyName || "")}" placeholder="e.g. Underground Associates"></label>
        <label class="field">Legal name <span class="hint">Who signs client agreements</span><input name="legalName" value="${esc(s.legalName || "")}" placeholder="e.g. Underground Associates LLC"></label>
        <div class="row"><label class="field">Business phone<input name="companyPhone" type="tel" value="${esc(s.companyPhone || "")}"></label>
        <label class="field">Business email <span class="hint">Shown everywhere</span><input name="companyEmail" type="email" value="${esc(s.companyEmail || "")}"></label></div>
        <label class="field">Our Google review link <span class="hint">From your Google profile: “Ask for reviews” → copy link. Texted to happy clients.</span><input name="companyReviewUrl" type="url" value="${esc(s.companyReviewUrl || "")}" placeholder="https://g.page/r/…/review"></label>
        <label class="field">Owner's direct email <span class="hint">Shown on your website as "Need the owner directly?"</span><input name="directEmail" type="email" value="${esc(s.directEmail || "")}" placeholder="post@undergroundassociates.com"></label>
        <label class="field">Google account for client profiles <span class="hint">Clients add this email as a Manager on their Google listing</span><input name="gbpEmail" type="email" value="${esc(s.gbpEmail || "")}" placeholder="yourbusiness@gmail.com"></label>
        ${!meta.me.id || meta.me.id === "owner" ? `<label class="field">Your name <span class="hint">Your texts say "Hi, this is ___ with ${esc(s.companyName || "your company")}". Everyone else's texts use their own login names.</span><input name="callerName" value="${esc(s.callerName || "")}" placeholder="e.g. Post"></label>` : ""}
        <h2 style="margin-top:18px">Plans &amp; prices</h2>
        <div class="card small" style="margin:8px 0">${meta.checkout && meta.checkout.online
          ? `✅ <strong>Online checkout is on.</strong> Sign-up links, “Buy now” on your website and “Buy extras” links all go to a Stripe checkout with exactly what the client picked. The payment links below aren't needed.`
          : `<strong>Online checkout isn't on yet.</strong> Add your Stripe key as the Cloudflare secret <code>STRIPE_SECRET_KEY</code> and clients can pick a plan, way to pay and extras and pay in one checkout. Until then, the payment links below are used (plan only).`}
          ${meta.checkout && !meta.checkout.webhook ? `<br>⚠️ Payments won't mark clients Paid by themselves until the Stripe webhook secret (<code>STRIPE_WEBHOOK_SECRET</code>) is added.` : ""}
          <br>${meta.checkout && meta.checkout.email ? "✅ <strong>Automatic emails are on</strong> (clients who ask for extras on your website get their Buy extras link by email)." : "Automatic emails are off. Add <code>RESEND_API_KEY</code> to email clients their Buy extras link when they ask on your website."}</div>
        <p class="small muted">${s.plans.length ? "" : "Suggested starting plans are filled in below. Change them to your prices, then Save. "}Leave a plan's name blank to hide it.</p>
        ${planRows(s.plans)}
        <h2 style="margin-top:18px">Ways to pay</h2>
        <div class="row" style="flex-wrap:wrap"><label class="field" style="flex:1 1 120px">Short plan (months) <span class="hint">No setup fee · 0 = don't offer</span><input name="shortMonths" type="number" min="0" max="36" inputmode="numeric" value="${s.shortMonths ?? 6}"></label>
        <label class="field" style="flex:1 1 120px">Standard plan (months) <span class="hint">No setup fee</span><input name="minMonths" type="number" min="0" max="36" inputmode="numeric" value="${s.minMonths ?? 12}"></label>
        <label class="field" style="flex:1 1 120px">Month-to-month setup ($) <span class="hint">0 = don't offer</span><input name="flexSetup" type="number" min="0" inputmode="decimal" value="${s.flexSetup ?? 299}"></label>
        <label class="field" style="flex:1 1 120px">Yearly: months free <span class="hint">0 = don't offer</span><input name="annualMonthsFree" type="number" min="0" max="6" inputmode="numeric" value="${s.annualMonthsFree ?? 2}"></label>
        <label class="field" style="flex:1 1 120px">Churches &amp; nonprofits: yearly months free <span class="hint">4 = 12 months for the price of 8</span><input name="churchAnnualMonthsFree" type="number" min="0" max="6" inputmode="numeric" value="${s.churchAnnualMonthsFree ?? 4}"></label></div>
        <h2 style="margin-top:18px">Extras</h2>
        <p class="small muted">Shown on the sign-up page and in call guides. Leave a name blank to remove it.</p>
        ${[...s.addons, { name: "", price: "", unit: "one-time" }].map((a, i) => `<div class="addon"><div class="row"><label class="field" style="flex:2"><span class="sr-only">Extra ${i + 1}</span><input name="addon_${i}_name" value="${esc(a.name)}" placeholder="New extra" maxlength="60"></label>
          <label class="field"><span class="sr-only">Price</span><input name="addon_${i}_price" type="number" min="0" inputmode="decimal" value="${a.price}" placeholder="$"></label>
          <label class="field"><span class="sr-only">Per</span><select name="addon_${i}_unit">${Object.entries(UNIT_LABEL).map(([k, v]) => `<option value="${k}"${a.unit === k ? " selected" : ""}>${k === "quote" ? "quote per job" : v.trim().replace("/", "per ")}</option>`).join("")}</select></label></div>
          <label class="field"><span class="sr-only">What they get</span><input name="addon_${i}_about" value="${esc(a.about || "")}" placeholder="One sentence on what they get" maxlength="200"></label>
          ${a.name ? `<details class="more"><summary>Contract terms for this extra</summary><label class="field"><span class="sr-only">Contract terms</span><textarea name="addon_${i}_terms" rows="4" maxlength="1500">${esc(a.terms || (meta.extraTerms || [])[i] || "")}</textarea></label><p class="small muted">Shown in the agreement customers sign when they pick this extra.</p></details>` : `<input type="hidden" name="addon_${i}_terms" value="">`}</div>`).join("")}
        <h2 style="margin-top:18px">Team goals &amp; commission</h2>
        <label class="field">Daily call goal per person <span class="hint">Shows as a progress bar on the Today card. 0 = off</span><input name="dailyCalls" type="number" min="0" max="500" inputmode="numeric" value="${s.dailyCalls ?? ""}"></label>
        <label class="field">Commission per sale ($)<input name="commission" type="number" min="0" inputmode="decimal" value="${s.commission ?? ""}"></label>
        <label class="field">Client agreement <span class="hint">Plain-language starting point, not legal advice. Have a lawyer look it over once.</span><textarea name="terms" rows="10">${esc(s.terms || meta.defaultTerms)}</textarea></label>
        <button class="btn btn--small" type="button" id="resetterms">Reset agreement to the standard text</button>
        <h2 style="margin-top:18px">Runs</h2>
        <label class="field">Default most sites per run<input name="cap" type="number" min="1" max="500" value="${s.defaultCap}"></label>
        <label class="field">AI writer<select name="model">${meta.models.map((m) => `<option value="${esc(m.id)}"${m.id === s.copyModel ? " selected" : ""}>${esc(m.label)}</option>`).join("")}</select></label>
        <div class="sticky-save"><button class="btn btn--primary" type="submit" style="width:100%">Save settings</button></div></form>
      <section class="card"><h2>Spending, last 30 days</h2><ul class="list">
        <li>AI writing: <strong>$${u.aiCost.toFixed(2)}</strong> <span class="muted small">(${u.aiTokensIn.toLocaleString()} in / ${u.aiTokensOut.toLocaleString()} out tokens)</span></li>
        <li>Google: about <strong>$${u.googleCostEstimate.toFixed(2)}</strong> <span class="muted small">(${u.googleRequests} searches, ${u.googlePhotos} photos; estimate, before Google's free monthly credit)</span></li></ul></section>
      ${callersCard(callers)}
      ${deviceCard()}
    </div>`;
    bindCallers();
    bindDevice();
    $app.querySelector("#resetterms").addEventListener("click", () => {
      if (confirm("Replace the agreement with the standard text?")) $app.querySelector("[name=terms]").value = meta.defaultTerms;
    });
    $app.querySelector("#sf").addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const f = e.target;
        const v = (n) => f.elements[n].value.trim();
        const n = (x) => (x === "" ? undefined : Number(x));
        const plans = PLAN_IDS.map((id) => ({
          id,
          name: v(`plan_${id}_name`),
          setup: Number(v(`plan_${id}_setup`) || 0),
          monthly: Number(v(`plan_${id}_monthly`) || 0),
          includes: v(`plan_${id}_includes`),
          payLink: v(`plan_${id}_pay`) || undefined,
          payLinkFlex: v(`plan_${id}_payflex`) || undefined,
          payLinkAnnual: v(`plan_${id}_payannual`) || undefined,
          payLinkShort: v(`plan_${id}_payshort`) || undefined,
        })).filter((p) => p.name);
        const addons = [];
        for (let i = 0; f.elements[`addon_${i}_name`]; i++) {
          const name = v(`addon_${i}_name`);
          if (name) addons.push({ name, price: Number(v(`addon_${i}_price`) || 0), unit: f.elements[`addon_${i}_unit`].value, about: v(`addon_${i}_about`) || undefined, terms: v(`addon_${i}_terms`) || undefined });
        }
        if (plans.some((p) => !p.monthly)) return toast("Give every plan a monthly price");
        const terms = v("terms");
        await api("/settings", {
          method: "PUT",
          json: {
            defaultCap: Number(f.cap.value),
            copyModel: f.model.value,
            companyName: v("companyName") || undefined,
            legalName: v("legalName") || undefined,
            companyPhone: v("companyPhone") || undefined,
            companyEmail: v("companyEmail") || undefined,
            directEmail: v("directEmail") || undefined,
            companyReviewUrl: v("companyReviewUrl") || undefined,
            gbpEmail: v("gbpEmail") || undefined,
            // Only the owner's own login shows this field; others keep the owner's name as it is.
            callerName: f.elements.callerName ? v("callerName") || undefined : s.callerName,
            plans,
            minMonths: n(v("minMonths")),
            shortMonths: n(v("shortMonths")),
            flexSetup: n(v("flexSetup")),
            annualMonthsFree: n(v("annualMonthsFree")),
            churchAnnualMonthsFree: n(v("churchAnnualMonthsFree")),
            dailyCalls: n(v("dailyCalls")),
            addons,
            commission: n(v("commission")),
            terms: terms && terms !== meta.defaultTerms ? terms : undefined,
          },
        });
        meta = null;
        toast("Saved");
      } catch (err) { toast(err.message); }
    });
  }

  /* ---------- notifications ---------- */
  const NOTIF_ICON = { note: "📝", call: "📞", status: "🏷️", signup_sent: "📨", signed: "✍️", paid: "💵", published: "🚀", added: "➕", message: "💬", run: "🔎", preview_open: "👀" };

  async function refreshNotifCount() {
    try {
      const { unread } = await api("/notifications/count");
      const el = document.getElementById("notif-count");
      el.textContent = unread > 99 ? "99+" : String(unread);
      el.hidden = !unread;
      if ("setAppBadge" in navigator) { unread ? navigator.setAppBadge(unread).catch(() => {}) : navigator.clearAppBadge().catch(() => {}); }
    } catch (e) { /* offline or logged out */ }
  }
  setInterval(() => { if (!document.hidden && meta) refreshNotifCount(); }, 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && meta) refreshNotifCount(); });

  const b64ToBytes = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

  async function pushState() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return { supported: false };
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return { supported: true, permission: Notification.permission, sub, reg };
  }

  async function turnOnPush() {
    const { key } = await api("/push/key");
    if (!key) throw new Error("Phone notifications aren't set up on the server yet");
    const perm = await Notification.requestPermission();
    if (perm !== "granted") throw new Error("Notifications are blocked. Allow them in your phone's settings for this app, then try again.");
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) }));
    await api("/push/subscribe", { method: "POST", json: { endpoint: sub.endpoint } });
  }

  function dayGroup(ms) {
    const d = new Date(ms);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.round((today - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
    return diff <= 0 ? "Today" : diff === 1 ? "Yesterday" : d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  }

  async function viewNotifications() {
    setNav("notifications");
    const my = renderSeq;
    const data = await api("/notifications");
    const ps = await pushState().catch(() => ({ supported: false }));
    if (stale(my)) return;
    const on = ps.supported && ps.permission === "granted" && ps.sub;
    let last = "";
    const rows = data.items.map((i) => {
      const g = dayGroup(i.at);
      const head = g !== last ? `<li class="notif__day">${esc(g)}</li>` : "";
      last = g;
      const time = new Date(i.at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
      const href = i.leadId && i.leadId !== "company" ? `#/lead/${i.leadId}` : i.kind === "message" ? "#/inbox" : "";
      const inner = `<span class="notif__icon" aria-hidden="true">${NOTIF_ICON[i.kind] || "🔔"}</span><span class="notif__text">${esc(i.text)}<span class="small muted"> · ${esc(time)}</span></span>`;
      return `${head}<li class="notif${i.unread ? " notif--new" : ""}">${href ? `<a href="${href}">${inner}</a>` : `<div>${inner}</div>`}</li>`;
    }).join("");
    $app.innerHTML = `<h1>Notifications</h1>
      <section class="card"><h2>Phone notifications</h2>
        ${!ps.supported ? `<p class="small muted">This browser can't show phone notifications. Use the installed app or Chrome on Android.</p>`
          : on ? `<p class="small">✅ On for this phone. ${isOwner() ? "You'll get a notification whenever someone else makes a change." : "You'll get a notification when a prospect opens their preview."}</p><div class="btns"><button class="btn btn--small" id="ptest">Send a test</button><button class="btn btn--small" id="poff">Turn off on this phone</button></div>`
          : `<p class="small muted">${isOwner() ? "Get a notification on this phone when a prospect opens their preview, someone adds a note, logs a call, makes a sale, a client signs up, or a website gets a message." : "Get a notification on this phone when a prospect opens the preview link you sent, so you can call while it's fresh."}</p><button class="btn btn--primary" id="pon">🔔 Turn on phone notifications</button>`}
      </section>
      <ul class="list notifs">${rows || `<li class="muted">${isOwner() ? "Nothing yet. When someone else adds a note, logs a call, makes a sale, or a client signs up, it shows here." : "Nothing yet. When a prospect opens their preview, it shows here."}</li>`}</ul>`;
    const pon = $app.querySelector("#pon");
    if (pon) pon.addEventListener("click", async () => { pon.disabled = true; try { await turnOnPush(); toast("Phone notifications are on"); viewNotifications(); } catch (err) { toast(err.message); pon.disabled = false; } });
    const ptest = $app.querySelector("#ptest");
    if (ptest) ptest.addEventListener("click", async () => { try { const r = await api("/push/test", { method: "POST" }); toast(r.sent ? "Test sent. It should pop up in a few seconds." : "Couldn't reach this phone. Try turning notifications off and on."); } catch (err) { toast(err.message); } });
    const poff = $app.querySelector("#poff");
    if (poff) poff.addEventListener("click", async () => { try { await api("/push/subscribe", { method: "DELETE", json: { endpoint: ps.sub.endpoint } }); await ps.sub.unsubscribe(); toast("Turned off on this phone"); viewNotifications(); } catch (err) { toast(err.message); } });
    if (data.unread) { await api("/notifications/seen", { method: "POST" }).catch(() => {}); refreshNotifCount(); }
  }

  /* ---------- router ---------- */
  function go(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  // Each screen opens at the top; the home list remembers where you were when you come back to it.
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  let lastHash = null;
  const scrollMemo = {};
  const isHomeHash = (h) => h === "#/" || h === "#" || h === "";

  async function render() {
    const h = location.hash || "#/";
    if (ignoreHashOnce) { ignoreHashOnce = false; if (h === lastHash) return; }
    if (h === lastHash) return route(h);
    if (leaveGuard && lastHash !== null && !leaveGuard()) {
      // Stay: put the hash back without re-rendering the screen (that would lose the typing we're protecting).
      ignoreHashOnce = true;
      location.hash = lastHash;
      return;
    }
    if (lastHash !== null) scrollMemo[isHomeHash(lastHash) ? "#/" : lastHash] = window.scrollY;
    lastHash = h;
    window.scrollTo(0, 0);
    await route(h);
    if (location.hash === h || (isHomeHash(h) && isHomeHash(location.hash))) window.scrollTo(0, isHomeHash(h) ? scrollMemo["#/"] || 0 : 0);
  }

  async function route(h) {
    renderSeq++;
    stopPolling();
    leaveGuard = null;
    while (cleanups.length) { try { cleanups.pop()(); } catch (e) { /* already gone */ } }
    document.body.classList.remove("showing");
    let m;
    try {
      if (h === "#/login") return await viewLogin();
      meta = meta || (await api("/meta"));
      if (!isOwner() && (/^#\/(edit|gbp)\//.test(h) || h === "#/inbox" || h === "#/sales")) return go("#/");
      if ((m = /^#\/lead\/([a-z0-9]+)$/.exec(h))) return await viewLead(m[1]);
      if ((m = /^#\/edit\/([a-z0-9]+)$/.exec(h))) return await viewEdit(m[1]);
      if ((m = /^#\/preview\/([a-z0-9]+)$/.exec(h))) return await viewPreview(m[1]);
      if ((m = /^#\/full\/([a-z0-9]+)(?:\/(es))?$/.exec(h))) return viewFull(m[1], m[2]);
      if ((m = /^#\/pitch\/([a-z0-9]+)$/.exec(h))) return await viewPitch(m[1]);
      if (h === "#/playbook") return await viewPlaybook();
      if ((m = /^#\/walkin(?:\/([a-z0-9]+))?$/.exec(h))) return await viewWalkin(m[1]);
      if ((m = /^#\/plans(?:\/([a-z0-9]+))?$/.exec(h))) return await viewShowPlans(m[1]);
      if (h === "#/route") return await viewRoute();
      if (h === "#/add") return await viewAdd();
      if ((m = /^#\/gbp\/([a-z0-9]+)$/.exec(h))) return await viewGbp(m[1]);
      if (h === "#/sales") return await viewSales();
      if (h === "#/inbox") return await viewInbox();
      if (h === "#/notifications") return await viewNotifications();
      if (h === "#/settings") return await viewSettings();
      $app.innerHTML = "";
      return await viewHome();
    } catch (err) {
      if (err.status !== 401) {
        $app.innerHTML = `<div class="card offline"><p>${esc(err.message)}</p><button class="btn btn--primary" id="reload">Try again</button></div>`;
        $app.querySelector("#reload").addEventListener("click", () => render());
      }
    }
  }

  addEventListener("hashchange", render);
  addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installPrompt = e; });
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  render();
})();
