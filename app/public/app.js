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
  const CATEGORY_LABEL = { restaurant: "Restaurant", contractor: "Contractor", salon: "Salon", auto: "Auto", landscaping: "Landscaping", cleaning: "Cleaning", print: "Print & signs", retail: "Shop", finance: "Tax & finance", church: "Church & nonprofit" , general: "Other business"};
  const groupLabel = (id) => ((meta && meta.categories.find((c) => c.id === id)) || {}).label || CATEGORY_LABEL[id] || id;
  const GOOGLE_PER_SEARCH = 0.064; // up to 2 pages of Text Search per search phrase
  const SALES = [["new", "New"], ["callbacks", "Callbacks"], ["activity", "Activity"], ["shown", "Shown"], ["sold", "Sold"], ["live", "Live"], ["not_interested", "Not interested"], ["", "All"]];
  const OUTCOME_LABEL = { no_answer: "📵 No answer", reached: "📞 Reached", not_in: "🚪 Owner not in", visited: "🚶 Talked in person", flyer: "📄 Left a flyer", callback: "📅 Call back", shown: "👍 Interested", sold: "🎉 Sold", not_interested: "✋ Not interested", link_sent: "📲 Preview link texted", signup_sent: "📝 Sent sign-up link", signed: "✍️ Signed up" };
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

  // The last failed request (path, status, message, time): "Report this" sends it along, so nobody has to describe an error.
  let lastError = null;
  function toast(msg, opts = {}) {
    const text = msg instanceof Error ? msg.message : String(msg);
    const report = opts.report || (lastError && Date.now() - lastError.at < 5000 && text === lastError.message);
    $toast.innerHTML = `<span>${esc(text)}</span>${report ? ` <button type="button" class="toast__report" data-toast-report>Report this</button>` : ""}`;
    $toast.hidden = false;
    const r = $toast.querySelector("[data-toast-report]");
    if (r) r.addEventListener("click", () => { $toast.hidden = true; reportProblem({ message: text }); });
    clearTimeout(toast.t);
    toast.t = setTimeout(() => ($toast.hidden = true), report ? 9000 : 3500);
  }

  /**
   * "Report this" (Oct 2026): one question (what were you doing?), then the screen, the last error, the browser and the
   * time go to POST /api/report. The owner reads them in Settings → Problems reported and gets a 🐞 alert.
   */
  async function reportProblem(extra = {}) {
    const step = prompt("What were you trying to do? One line is plenty; the error details go along by themselves.", extra.step || "");
    if (step === null) return;
    const err = lastError && Date.now() - lastError.at < 120000 ? lastError : null;
    const leadId = (/#\/(?:lead|edit|preview|pitch|walkin|gbp|full)\/([a-z0-9]+)/.exec(location.hash) || [])[1];
    try {
      await api("/report", { method: "POST", json: {
        app: "web", screen: (location.hash || "#/").slice(0, 120), step: step.trim().slice(0, 120) || undefined,
        message: String(extra.message || (err && err.message) || "Something didn't work").slice(0, 1000),
        detail: JSON.stringify({ error: err, when: new Date().toISOString(), online: navigator.onLine, size: `${innerWidth}×${innerHeight}` }).slice(0, 4000),
        device: navigator.userAgent.slice(0, 200), leadId,
      } });
      toast("Thanks, it's reported. The owner sees it under Settings → Problems reported.");
    } catch (e) { toast("Couldn't send the report: " + e.message); }
  }
  /** A "Copy" button for any text; one delegated click handler below serves every screen. */
  const copyBtn = (text, label = "Copy") => `<button class="btn btn--small" type="button" data-copytext="${esc(text)}">${label}</button>`;
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-copytext]");
    if (!b || b.dataset.bound) return;
    try { await navigator.clipboard.writeText(b.dataset.copytext); toast("Copied"); } catch (err) { toast("Couldn't copy"); }
  });
  const reportBtn = (label = "🐞 Report a problem") => `<button class="btn btn--small" type="button" data-report-problem>${label}</button>`;
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-report-problem]"); if (b) reportProblem({}); });
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason;
    if (!r || r.status === 401) return;
    lastError = { message: (r && r.message) || String(r), at: Date.now(), path: r && r.path, status: r && r.status, stack: r && r.stack ? String(r.stack).slice(0, 600) : undefined };
    toast(lastError.message, { report: true });
  });

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
      err.path = path;
      lastError = { message: err.message, at: Date.now(), path, status: 0 };
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
      // Plain words for the two cases nobody can act on from the message itself.
      const text = res.status >= 500 ? `The app's server hit a problem${data.error ? ` (${data.error})` : ""}. Try again in a moment; if it keeps happening, report it.`
        : res.status === 404 && !data.error ? "That isn't here any more. Go back to Leads and try again."
        : data.error || "Something went wrong";
      const err = new Error(text);
      err.data = data;
      err.status = res.status;
      err.path = path;
      lastError = { message: text, at: Date.now(), path, status: res.status, server: data.error };
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
    const [state, cfg] = await Promise.all([api("/auth/state"), api("/auth/config").catch(() => ({}))]);
    if (state.loggedIn) return go("#/");
    const setup = !state.hasOwner;
    const google = !setup && !!cfg.googleClientId;
    const passwords = setup || !cfg.requireGoogle;
    $app.innerHTML = `<div class="login card">
      <h1>${setup ? "Create your password" : google ? "Sign in" : "Log in"}</h1>
      ${google ? `<p class="muted">Use your <strong>@${esc(cfg.domain || "")}</strong> Google account.</p><div id="gbtn" style="margin:12px 0 16px;min-height:44px"></div><p class="small muted" id="gmsg"></p>` : ""}
      ${passwords ? `<p class="muted">${setup ? "First time here. Pick a password only you know. You'll use it to open the app on any device." : google ? "Or use a password:" : "Enter your password. Callers use the password the owner gave them."}</p>
      <form id="f">
        <label class="field">Password<input type="password" name="password" autocomplete="${setup ? "new-password" : "current-password"}" minlength="${setup ? 8 : 1}" required></label>
        ${setup ? `<label class="field">Type it again<input type="password" name="again" autocomplete="new-password" required></label>` : ""}
        <button class="btn ${google ? "" : "btn--primary"}" type="submit">${setup ? "Create password" : "Log in"}</button>
      </form>` : `<p class="small muted">Passwords are turned off for this team.</p>`}</div>`;
    if (google) {
      const finish = async (idToken) => {
        try {
          await api("/auth/google", { method: "POST", json: { idToken } });
          meta = null;
          const next = new URLSearchParams(location.search).get("next");
          if (next && next.startsWith("/p/")) location.href = next;
          else go("#/");
        } catch (err) { const m = document.getElementById("gmsg"); if (m) m.textContent = err.message; }
      };
      let tries = 0;
      const render = () => {
        const el = document.getElementById("gbtn");
        if (!el) return;
        if (!window.google || !window.google.accounts) {
          // Google's script hasn't loaded (blocked, offline, or an ad blocker): say so instead of showing nothing forever.
          if (++tries > 30) { const m = document.getElementById("gmsg"); if (m) m.textContent = "Google's sign-in button couldn't load. Check your connection or an ad/script blocker, then reload."; return; }
          setTimeout(render, 300);
          return;
        }
        window.google.accounts.id.initialize({ client_id: cfg.googleClientId, hosted_domain: cfg.domain || undefined, callback: (r) => finish(r.credential), ux_mode: "popup", auto_select: false });
        window.google.accounts.id.renderButton(el, { theme: "outline", size: "large", text: "signin_with", shape: "pill", width: 280 });
      };
      render();
    }
    const form = $app.querySelector("#f");
    if (form) form.addEventListener("submit", async (e) => {
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

  /** Home shows only runs that are still going (or stopped early); the Find leads screen shows the recent ones too. */
  function runsHtml(runs, all) {
    const rows = all ? runs.slice(0, 5) : runs.filter((r) => !r.done || r.stalled).slice(0, 3);
    if (!rows.length) return all ? `<section class="card"><h2>Recent runs</h2><p class="muted small">No runs yet. Pick categories above and tap Run.</p></section>` : "";
    return `<section class="card"><h2>${all ? "Recent runs" : "Running now"}</h2>${rows
      .map((r) => {
        const c = r.counts;
        const total = Object.values(c).reduce((a, b) => a + b, 0);
        const finished = (c.ready || 0) + (c.failed || 0);
        const searching = r.searchesDone < r.searchesTotal;
        const pct = r.stalled ? 100 : searching ? Math.round((r.searchesDone / Math.max(r.searchesTotal, 1)) * 20) : total ? 20 + Math.round((finished / total) * 80) : 100;
        const label = r.stalled
          ? `Stopped early · ${c.ready || 0} site${c.ready === 1 ? "" : "s"} ready. Run it again to pick up the rest.`
          : searching
            ? `Searching Google… (${r.searchesDone}/${r.searchesTotal})`
            : r.done
              ? `Done · ${c.ready || 0} sites ready${c.failed ? ` · ${c.failed} failed` : ""}`
              : `Building sites… ${finished} of ${total}`;
        const opts = [r.options && r.options.wider ? "nearby towns" : "", r.options && r.options.badSites ? "outdated sites" : ""].filter(Boolean);
        return `<div><div class="row"><strong>${esc(r.categories.map(groupLabel).join(", "))}${opts.length ? ` <span class="muted small">+ ${esc(opts.join(", "))}</span>` : ""}</strong><span class="muted small" style="text-align:right">${ago(r.createdAt)}</span></div>
          <div class="progress${r.stalled ? " progress--warn" : ""}" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
          <p class="small muted" style="margin:0 0 10px">${r.done ? "" : '<span class="spin"></span> '}${esc(label)}${r.stalled ? ` <button type="button" class="btn btn--small" data-dismiss-run="${esc(r.id)}">Dismiss</button>` : ""}</p></div>`;
      })
      .join("")}</section>`;
  }

  function bindRunDismiss(el, after) {
    el.querySelectorAll("[data-dismiss-run]").forEach((b) =>
      b.addEventListener("click", async () => {
        b.disabled = true;
        try { await api(`/runs/${b.dataset.dismissRun}/dismiss`, { method: "POST", json: {} }); after(); } catch (err) { toast(err.message); b.disabled = false; }
      }),
    );
  }

  /** The category picker + Run button, with the cost estimate and Pick all. `onStarted` runs after a successful Run. */
  function bindRunForm(form, onStarted) {
    const updateEst = () => {
      const cats = [...form.querySelectorAll("input[name=cat]:checked")].map((i) => i.value);
      const cap = Number(form.cap.value) || 0;
      form.querySelector("#est").textContent = cats.length ? `Up to ${cap} sites. Writing costs about $${estimate(cats, cap)} at most, plus up to $${googleEstimate(cats, form.wider.checked)} for Google searches.` : "Pick at least one category.";
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
      const btn = form.querySelector("button[type=submit]");
      btn.disabled = true;
      try {
        await api("/runs", { method: "POST", json: { categories: cats, cap: Number(form.cap.value), wider: form.wider.checked, badSites: form.badSites.checked } });
        toast("Run started. It keeps going in the cloud; new sites show up on the Leads screen.");
        onStarted();
      } catch (err) {
        toast(err.message);
      } finally {
        btn.disabled = false;
      }
    });
  }

  /** #/run: the owner's Find new leads screen (the category picker used to sit on the home screen). */
  async function viewRun() {
    setNav("home");
    const my = renderSeq;
    meta = meta || (await api("/meta"));
    if (stale(my)) return;
    if (!isOwner()) return go("#/");
    $app.innerHTML = `<p><a href="#/">← Leads</a></p><h1>Find new leads</h1>${runCard()}<div id="runs"><p class="muted small">Loading…</p></div>`;
    bindRunForm($app.querySelector("#run"), () => refreshRuns());
    await refreshRuns();
  }

  async function refreshRuns() {
    stopPolling();
    if (location.hash !== "#/run") return;
    const my = renderSeq;
    try {
      const { runs } = await api("/runs");
      if (stale(my)) return;
      const el = document.getElementById("runs");
      if (!el) return;
      el.innerHTML = runsHtml(runs, true);
      bindRunDismiss(el, () => refreshRuns());
      if (runs.some((r) => !r.done)) pollTimer = setTimeout(refreshRuns, 5000);
    } catch (err) {
      if (stale(my) || err.status === 401) return;
      toast(err.message);
    }
  }

  function statusChip(l) {
    if (l.salesStatus === "live") return `<span class="chip chip--good">● Live</span>`;
    if (l.salesStatus === "not_interested") return `<span class="chip">Not interested</span>`;
    if (l.status === "queued") return `<span class="chip">Queued to build</span>`;
    if (l.status === "building") return `<span class="chip"><span class="spin"></span> Building the preview</span>`;
    if (l.status === "failed") return `<span class="chip chip--bad">Preview failed</span>`;
    return `<span class="chip chip--good">Preview ready</span>`;
  }

  /** "stonebridgewedding.com" from a lead's foundUrl (a page the web-presence check found). */
  function foundHost(l) {
    try { return new URL(l.foundUrl).hostname.replace(/^www\./, ""); } catch { return "another site"; }
  }
  function foundLine(l) {
    return l && l.foundUrl ? `<div class="lead__meta small">🔗 Found page: <a href="${esc(l.foundUrl)}" target="_blank" rel="noopener">${esc(foundHost(l))}</a> (not linked from their Google listing)</div>` : "";
  }

  /** Activity tab: the newest call-log entry on the card, so the list reads like a log. */
  function lastNoteLine(l) {
    if (l.lastNote === undefined) return "";
    if (!l.lastNote) return `<div class="lead__meta">📝 No notes yet${l.previewOpens ? ` · 👀 opened preview ${l.previewOpens}×` : ""}</div>`;
    const n = l.lastNote;
    const head = n.outcome && OUTCOME_LABEL[n.outcome] ? OUTCOME_LABEL[n.outcome] : "📝 Note";
    return `<div class="lead__meta">${head} · ${esc(n.author)} · ${ago(n.at)}${l.notes > 1 ? ` · ${l.notes} entries` : ""}${n.body ? `<br><span class="small">${esc(n.body.length > 140 ? n.body.slice(0, 140) + "…" : n.body)}</span>` : ""}</div>`;
  }

  function leadCard(l) {
    const rating = l.rating ? `<span class="stars">★ ${l.rating.toFixed(1)}</span>` : "";
    return `<li class="card lead">
      <div class="lead__top"><a class="lead__name" href="#/lead/${l.id}">${esc(l.name)}</a>${statusChip(l)}</div>
      <div class="lead__meta">${esc(CATEGORY_LABEL[l.category] || l.category)} · ${esc(l.reason || "")} ${rating ? "· " + rating : ""}</div>
      <div class="lead__meta">${esc(l.address || "")}</div>
      ${foundLine(l)}
      ${contactLine(l) ? `<div class="lead__meta">${contactLine(l)}</div>` : ""}
      ${lastNoteLine(l)}
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
      $app.innerHTML = `<div class="split"><div><div id="start">${startHtml()}</div><div id="pushask"></div><div id="today"></div><div id="tasks"></div><div id="runs"></div></div><div><section>
        <div class="btns btns--full" style="margin-bottom:12px">${isOwner() ? `<a class="btn btn--primary" href="#/run">🔎 Find new leads</a>` : ""}<a class="btn" href="#/add">➕ Add a business</a><a class="btn" href="#/route">🗺️ Walk-in route</a><a class="btn" href="#/walkin">🚶 In-person guide</a><a class="btn" href="#/playbook">💬 Plans & answers</a><a class="btn" href="#/plans">📋 Show plans</a><a class="btn" href="#/commission">💰 What I'd earn</a><a class="btn" href="#/training">🎓 Training</a><a class="btn" href="#/guide/words">📖 What the words mean</a><a class="btn" href="#/changelog">📋 What's new</a></div>
        <div class="tabs" role="tablist">${SALES.map(([k, l]) => `<button type="button" data-sales="${k}" class="${filters.sales === k ? "is-on" : ""}">${l}</button>`).join("")}</div>
        <label class="field"><span class="sr-only">Category</span><select id="catfilter"><option value="">All categories</option>${meta.categories
          .map((c) => `<option value="${esc(c.id)}"${filters.category === c.id ? " selected" : ""}>${esc(c.label)}</option>`)
          .join("")}</select></label>
        <ul class="list" id="leads"><li class="muted">Loading…</li></ul></section></div></div>`;
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
    bindStart();
    await pushAsk();
    await refreshHome();
  }

  /** "Start here" for a new teammate: three lessons and the practice run, until done or dismissed (server-side, per person). */
  function startHtml() {
    const st = meta && meta.start;
    if (!st || !st.show) return "";
    const n = st.lessons.filter((l) => l.done).length;
    return `<section class="card start"><h2>👋 Start here${n ? ` · ${n} of ${st.lessons.length} done` : ""}</h2>
      <p class="small muted">Four things and you know the job. Each one takes a few minutes.</p>
      <ol class="start__list">${st.lessons.map((l) => `<li class="${l.done ? "is-done" : ""}">${l.done ? "✅" : "▢"} ${l.practice && st.practiceLeadId ? `<a href="#/lead/${esc(st.practiceLeadId)}">${esc(l.title)}</a> <span class="small muted">(on the practice lead; everything on it is $1)</span>` : `<a href="#/training">${esc(l.title)}</a>`}</li>`).join("")}</ol>
      <div class="btns"><a class="btn btn--primary btn--small" href="#/training">🎓 Open Training</a><a class="btn btn--small" href="#/guide/words">📖 What the words mean</a><button class="btn btn--small" type="button" data-start-dismiss>Not now</button></div></section>`;
  }
  function bindStart() {
    const b = $app.querySelector("[data-start-dismiss]");
    if (b) b.addEventListener("click", async () => {
      try { await api("/start/dismiss", { method: "POST" }); if (meta && meta.start) meta.start.show = false; const el = document.getElementById("start"); if (el) el.innerHTML = ""; toast("You'll find Training under the buttons on the right any time."); } catch (err) { toast(err.message); }
    });
  }

  /* ---------- the one next step (shared by Home's queue and the lead page) ---------- */
  const STEP_ICON = { take_payment: "💳", callback: "📅", opened: "👀", follow_up: "🔁", publish: "🚀", call: "📞", building: "⏳", failed: "⚠️", live: "🌐", closed: "✋", cadence_done: "🏁" };
  const STEP_CLASS = { take_payment: "chip--warn", callback: "chip--warn", opened: "chip--good", publish: "chip--good", failed: "chip--bad" };
  /**
   * The button for a step. On the lead page (`onPage`) it acts right there (data-step); on Home it links to the lead page
   * with the step in the hash (#/lead/<id>/<route>), which runs the same action once the page is up.
   */
  function stepButton(l, step, { small = false, onPage = false } = {}) {
    const cls = `btn${small ? " btn--small" : ""} btn--primary`;
    const r = step.route;
    const icon = STEP_ICON[step.key] || "👉";
    if (r === "call") return l.status === "ready" ? `<a class="${cls}" href="#/pitch/${l.id}">📞 Call guide</a><a class="btn${small ? " btn--small" : ""}" href="${telHref(l.phone)}">📞 Call now</a>` : `<a class="${cls}" href="${telHref(l.phone)}">📞 Call</a>`;
    if (r === "walkin") return `<a class="${cls}" href="#/walkin/${l.id}">🚶 ${esc(step.action)}</a>`;
    if (r === "wait") return `<button class="btn${small ? " btn--small" : ""}" type="button" disabled>${esc(step.action)}</button>`;
    return onPage ? `<button class="${cls}" type="button" data-step="${esc(r)}">${icon} ${esc(step.action)}</button>` : `<a class="${cls}" href="#/lead/${l.id}/${esc(r)}">${icon} ${esc(step.action)}</a>`;
  }
  function nextStepCardHtml(l) {
    const s = l.nextStep;
    if (!s) return "";
    return `<section class="card step step--${esc(s.key)}"><p class="step__eyebrow">Next step</p><h2>${STEP_ICON[s.key] || "👉"} ${esc(s.title)}</h2>${s.detail ? `<p class="small">${esc(s.detail)}</p>` : ""}<div class="btns">${stepButton(l, s, { onPage: true })}</div></section>`;
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

  /** Home's queue (GET /api/queue): every lead that needs something, most urgent first, each with its one next step. */
  function queueHtml(q) {
    const rows = q.rows || [];
    const c = q.counts || {};
    const goal = Number(meta.settings.dailyCalls) || 0;
    const done = loggedToday();
    const plural = (n, w, ws) => `${n} ${n === 1 ? w : ws || w + "s"}`;
    const bits = [c.take_payment ? plural(c.take_payment, "payment", "payments") + " to finish" : "", c.callback ? plural(c.callback, "callback") : "", c.opened ? plural(c.opened, "opened preview") : "", c.follow_up ? plural(c.follow_up, "follow-up") : "", c.publish ? plural(c.publish, "site") + " to publish" : "", c.call ? plural(c.call, "new lead") + " to call" : ""].filter(Boolean);
    return `<section class="card due today"><h2>📋 Up next${rows.length ? ` · ${rows.length}` : ""}${done ? ` <span class="small muted" style="font-weight:400">· you've logged ${done} today</span>` : ""}</h2>
      ${goal ? `<div class="goal" role="progressbar" aria-valuenow="${Math.min(done, goal)}" aria-valuemin="0" aria-valuemax="${goal}" aria-label="Calls logged today"><i style="width:${Math.min(100, Math.round((done / goal) * 100))}%"></i></div><p class="small muted" style="margin:0 0 6px">${done >= goal ? `Goal of ${goal} reached 🎉` : `${goal - done} more to reach today's goal of ${goal}`}</p>` : ""}
      ${bits.length ? `<p class="small muted" style="margin:0 0 6px">${esc(bits.join(" · "))}</p>` : ""}
      ${rows.length ? `<ul class="list queue">${rows.map(({ lead: l, step }) => `<li><div class="row"><a href="#/lead/${l.id}"><strong>${esc(l.name)}</strong></a><span class="chip why ${STEP_CLASS[step.key] || ""}">${STEP_ICON[step.key] || ""} ${esc(step.title)}</span></div>
        <p class="small muted" style="margin:2px 0 0">${esc(step.detail)}${contactLine(l) ? ` · ${contactLine(l)}` : ""}</p>
        <div class="btns" style="margin-top:6px">${stepButton(l, step, { small: true })}<a class="btn btn--small" href="#/lead/${l.id}">Open</a></div></li>`).join("")}</ul>`
        : `<p class="small muted">Nothing waiting. Pick a New lead below and make a call.</p>`}</section>`;
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
    el.innerHTML = `<section class="card due"><h2>🔔 Turn on phone alerts?</h2><p class="small muted">Get a notification when a prospect opens their preview, or a teammate adds a note, logs a call, sets a callback, makes a sale or gets a sign-up.</p>
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
    else if (filters.sales === "activity") q.set("activity", "1");
    else if (filters.sales) q.set("sales", filters.sales);
    if (filters.category) q.set("category", filters.category);
    const leadsEl0 = document.getElementById("leads");
    try {
      const [{ runs }, { leads }, queue, { tasks: openTasks }] = await Promise.all([
        isOwner() ? api("/runs") : Promise.resolve({ runs: [] }),
        api("/leads?" + q),
        api("/queue").catch(() => ({ rows: [], counts: {} })),
        api("/tasks?scope=open").catch(() => ({ tasks: [] })),
      ]);
      if (stale(my)) return;
      const runsEl = document.getElementById("runs");
      const leadsEl = document.getElementById("leads");
      if (!runsEl || !leadsEl) return;
      runsEl.innerHTML = runsHtml(runs, false);
      bindRunDismiss(runsEl, () => refreshHome());
      const todayEl = document.getElementById("today");
      if (todayEl) todayEl.innerHTML = queueHtml(queue);
      const tasksEl = document.getElementById("tasks");
      if (tasksEl) { tasksEl.innerHTML = tasksHomeHtml(openTasks); bindTaskChecks(tasksEl, () => refreshHome()); }
      const empty = {
        new: isOwner() ? "No new leads yet. Tap Find new leads to run a search." : "No new leads right now. Check back after the next run.",
        callbacks: "No callbacks scheduled. Use “Call back…” after a call to schedule one.",
        activity: "Nothing logged yet. Leads with a call or note, a task, a sign-up, a callback or an opened preview show here, newest first.",
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
    return `<section class="card" id="logcard"><h2>Log a call or visit</h2>
      <label class="field">Notes<textarea name="note" rows="3" maxlength="2000" placeholder="Who you talked to, what they said, best time to call…"></textarea></label>
      <div class="field"><span>Call back on <span class="hint">${current ? "Now set for " + esc(dayLabel(current)) : "Not set"}</span></span>
        <div class="chips">${[[1, "Tomorrow"], [3, "In 3 days"], [7, "Next week"]].map(([n, t]) => `<button type="button" class="pick" data-days="${n}">${t}</button>`).join("")}</div>
        <input type="date" name="follow" min="${dayFromNow(0)}" value="${current}"></div>
      <p style="margin:0 0 6px"><strong>How did it go?</strong> <span class="small muted">Tap one to save.</span></p>
      <div class="btns btns--full" id="outcomes">
        <button class="btn" type="button" data-out="no_answer">📵 No answer</button>
        <button class="btn" type="button" data-out="reached">📞 Reached</button>
        <button class="btn" type="button" data-out="not_in">🚪 Owner not in</button>
        <button class="btn" type="button" data-out="visited">🚶 Talked in person</button>
        <button class="btn" type="button" data-out="flyer">📄 Left a flyer</button>
        <button class="btn" type="button" data-out="shown">👍 Interested (shown)</button>
        <button class="btn" type="button" data-out="callback">📅 Call back</button>
        <button class="btn btn--good" type="button" data-out="sold">🎉 Sold</button>
        <button class="btn" type="button" data-out="not_interested">✋ Not interested</button>
      </div>
      <div id="lostwhy" hidden style="margin-top:10px"><p style="margin:0 0 6px"><strong>Why not?</strong> <span class="small muted">Tap one to save.</span></p>
        <div class="chips">${LOST_REASONS.map(([k, t]) => `<button type="button" class="pick" data-why="${k}">${t}</button>`).join("")}<button type="button" class="linkbtn" data-why-cancel>Cancel</button></div></div>
      <p style="margin:10px 0 0"><button class="linkbtn" type="button" data-out="note">Just save a note</button></p>
      <p class="small muted" style="margin-top:6px">No answer and Owner not in schedule a callback for tomorrow unless you pick a day. Left a flyer marks them Shown (the flyer has their preview on it). Sold and Not interested clear the callback. If they ask not to be called again, tap Not interested.</p></section>`;
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
  const isAndroid = () => /Android/i.test(navigator.userAgent);
  const tapReady = () => !!(meta && meta.tap && meta.tap.ready);
  /** A sign-up link opened on this phone: on the owner's Android with Tap to Pay set up, the page offers the tap instead of Stripe's card form. */
  function tapHref(url) {
    return tapReady() && isAndroid() ? url + (url.includes("?") ? "&" : "?") + "tap=1" : url;
  }
  function tapButtonHtml(x) {
    if (x.paid || (x.extras && x.extras.invoice)) return "";
    if (!tapReady()) return meta.tap && meta.tap.why && meta.checkout && meta.checkout.online ? `<p class="small muted">💳 Tap to Pay isn't set up yet: <a href="#/settings">Settings → Tap to Pay</a>.</p>` : "";
    return isAndroid()
      ? `<p><button class="btn btn--small btn--primary" type="button" data-tap="${esc(x.id)}">💳 Take payment by tap</button> <span class="small muted">${x.dueCents ? `${money(x.dueCents / 100)} now, renewals on the same card` : ""}</span></p>`
      : `<p class="small muted">💳 Open this in the Android app to take their card by tap.</p>`;
  }
  /** The "they're a client now" card: the first paid sign-up, how they paid, what renews, and what's next. */
  function clientCardHtml(l) {
    const x = (l.signups || []).find((s) => s.paid);
    if (!x) return "";
    const how = { tap: "by tap, in person", card: "by card on the phone", stripe: "online", invoice: "by invoice" }[x.paidVia] || (x.paidVia ? esc(x.paidVia) : "marked paid by hand");
    const renews = x.extras && x.extras.renews;
    const every = renews ? (renews.interval === "year" ? "yearly" : "monthly") : "";
    const renewLine = l.payTest ? "Practice lead: nothing renews and no real subscription was started."
      : x.subscription && renews ? `Renews ${every} at ${money(renews.amount / 100)} on the card on file.`
      : renews ? `Renews ${every} at ${money(renews.amount / 100)}; automatic payment isn't set up yet (open their billing portal or take the card).`
      : "";
    const next = l.salesStatus === "live"
      ? `Live at <a href="${esc(l.liveUrl || "#")}" target="_blank" rel="noopener">${esc((l.liveUrl || "").replace("https://", ""))}</a>.`
      : "Next: go over photos, hours and the to-dos with them, then Publish.";
    return `<section class="card card--client"><h2>✅ Client · ${esc(x.plan.name)} plan</h2>
      <p>${esc(x.plan.billingLabel || "")}${x.dueCents != null ? ` · paid ${money(x.dueCents / 100)} ${how}` : ` · paid ${how}`} · signed ${new Date(x.createdAt).toLocaleDateString()}</p>
      ${x.extras && x.extras.founder ? `<p class="small">🎁 Founding customer: <strong>${esc(x.extras.founder)}</strong> free with the plan.</p>` : ""}
      ${renewLine ? `<p class="small">${renewLine}</p>` : ""}<p class="small">${next}</p></section>`;
  }
  /** Who sent this lead (any client can be the referrer) and, for a client, the credits they earned by referring others. */
  function referralCardHtml(l) {
    const r = l.referral;
    if (!r) return "";
    const client = l.salesStatus === "sold" || l.salesStatus === "live";
    const phone = phoneDigits(l);
    const status = (c) => c.status === "applied" ? `✅ applied${c.appliedAt ? " " + new Date(c.appliedAt).toLocaleDateString() : ""}` : c.status === "by_hand" ? "✋ apply by hand on their next invoice" : "🏦 banked for the next referral year";
    return `<section class="card" id="referralcard"><h2>🤝 Referrals</h2>
      <p class="small">Referred by: <strong>${r.referredBy ? esc(r.referredBy.name) : "nobody yet"}</strong> <button class="btn btn--small" type="button" data-ref-pick>${r.referredBy ? "Change" : "Add who sent them"}</button>${r.referredBy ? ` <button class="btn btn--small" type="button" data-ref-clear>Clear</button>` : ""}</p>
      <div id="refpicker" hidden><label class="field">Which client sent them? <select data-ref-select><option value="">Loading…</option></select></label></div>
      <p class="small muted">${r.referredBy ? `When this plan's first payment goes through on a ${r.minMonths}- or 12-month plan, ${esc(r.referredBy.name)} gets ${r.months} months free.` : `A client who sends us a business gets ${r.months} months free once that business pays for a ${r.minMonths}- or 12-month plan (up to ${r.maxPerYear} a year; the rest bank for the next year).`}</p>
      ${client ? `<h3>Credits they earned</h3>${r.credits.length ? `<ul class="list small">${r.credits.map((c) => `<li>${esc(c.referred.name)} · ${c.months} months · ${status(c)}${c.status === "by_hand" && isOwner() ? ` <button class="btn btn--small" type="button" data-ref-applied="${esc(c.id)}">Mark applied</button>` : ""}${c.note ? `<br><span class="muted">${esc(c.note)}</span>` : ""}</li>`).join("")}</ul><p class="small muted">${r.usedThisYear} of ${r.maxPerYear} used this referral year${r.nextYearAt ? `; the next year starts ${new Date(r.nextYearAt).toLocaleDateString()}` : ""}.</p>` : `<p class="small muted">None yet. Tell them about it:</p>`}
      <div class="btns btns--full"><a class="btn" href="sms:+1${phone}?body=${encodeURIComponent(r.inviteText)}">💬 Text them about referrals</a>${copyBtn(r.inviteText, "Copy")}</div>` : ""}
    </section>`;
  }
  function bindReferral(l, after) {
    const card = document.getElementById("referralcard");
    if (!card) return;
    const box = card.querySelector("#refpicker");
    const sel = card.querySelector("[data-ref-select]");
    const pick = card.querySelector("[data-ref-pick]");
    if (pick) pick.addEventListener("click", async () => {
      box.hidden = !box.hidden;
      if (box.hidden || sel.dataset.loaded) return;
      try {
        const [a, b] = await Promise.all([api("/leads?sales=sold"), api("/leads?sales=live")]);
        const rows = [...(a.leads || []), ...(b.leads || [])].filter((x) => x.id !== l.id && !x.payTest).sort((x, y) => (x.name || "").localeCompare(y.name || ""));
        sel.innerHTML = `<option value="">Pick a client…</option>` + rows.map((x) => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join("");
        sel.dataset.loaded = "1";
      } catch (e) { toast(e.message); }
    });
    if (sel) sel.addEventListener("change", async () => {
      if (!sel.value) return;
      try { await api(`/leads/${l.id}/referrer`, { method: "PUT", json: { leadId: sel.value } }); toast("Saved"); after(); } catch (e) { toast(e.message); }
    });
    const clear = card.querySelector("[data-ref-clear]");
    if (clear) clear.addEventListener("click", async () => {
      try { await api(`/leads/${l.id}/referrer`, { method: "PUT", json: { leadId: null } }); after(); } catch (e) { toast(e.message); }
    });
    card.querySelectorAll("[data-ref-applied]").forEach((b) => b.addEventListener("click", async () => {
      try { await api(`/referrals/${b.dataset.refApplied}/applied`, { method: "POST" }); toast("Marked applied"); after(); } catch (e) { toast(e.message); }
    }));
  }
  /** The default order for the three-tap sign-up: the Plus plan (else the middle one) on the standard term. */
  function quickSignup(l) {
    const plans = (meta.settings.plans || []).filter((p) => p.monthly && p.id !== "list");
    if (!plans.length) return null;
    const p = plans.find((x) => x.id === "plus") || plans[Math.floor((plans.length - 1) / 2)];
    const t = payTerms(meta.settings, l.category === "church");
    return { id: p.id, name: p.name, monthly: p.monthly, billing: "standard", termLabel: t.min ? `${t.min}-month plan` : "monthly" };
  }
  function signupCardHtml(l) {
    const plans = meta.settings.plans || [];
    const signed = (l.signups || [])[0];
    const quick = quickSignup(l);
    return `<section class="card" id="signupcard"><h2>${signed ? "Signed up" : "Sign them up"}</h2>
      ${(l.signups || []).map((x) => `<div class="signed"><strong>✍️ ${esc(x.plan.name)}${x.plan.billingLabel ? ` · ${esc(x.plan.billingLabel)}` : ""}</strong>
        <p class="small">${esc(x.plan.billingDetail || `${money(x.plan.monthly)}/month${x.plan.setup ? ` + ${money(x.plan.setup)} setup` : ""}`)}</p>
        ${x.extras && (x.extras.extras.length || x.extras.quotes.length) ? `<p class="small">Extras: ${esc([...x.extras.extras.map((e) => (e.qty > 1 ? `${e.name} ×${e.qty}` : e.name)), ...x.extras.quotes.map((q) => `${q} (quote)`)].join(", "))}</p>` : ""}
        ${x.dueCents ? `<p class="small">Due at sign-up: <strong>${money(x.dueCents / 100)}</strong></p>` : ""}
        <p class="small"><a href="/api/agreements/s/${x.id}" target="_blank" rel="noopener">📄 Signed agreement</a> · <a href="/api/agreements/s/${x.id}.pdf">⬇ PDF</a></p>
        <p class="small muted">${esc(x.signerName)}${x.signerTitle ? ", " + esc(x.signerTitle) : ""} · ${esc(x.signerEmail || "")} · ${ago(x.createdAt)}${x.sentBy ? ` · sent by ${esc(x.sentBy)}` : ""}</p>
        ${tapButtonHtml(x)}
        <label class="check"><input type="checkbox" data-paid="${x.id}"${x.paid ? " checked" : ""}> Payment is set up</label></div>`).join("")}
      ${(l.purchases || []).length ? `<h3 style="margin-top:12px">Extras bought later</h3><ul class="list small">${l.purchases.map((p) => `<li>${esc([...p.extras.map((e) => (e.qty > 1 ? `${e.name} ×${e.qty}` : e.name)), ...p.quotes.map((q) => `${q} (quote)`)].join(", "))} · ${money(p.dueCents / 100)} · ${p.paid ? "✅ paid" : "not paid yet"} · ${ago(p.createdAt)} · <a href="/api/agreements/p/${p.id}" target="_blank" rel="noopener">📄 agreement</a> · <a href="/api/agreements/p/${p.id}.pdf">⬇ PDF</a></li>`).join("")}</ul>` : ""}
      ${plans.length
        ? `${!signed && quick ? `<div class="quick"><button class="btn btn--primary btn--big" type="button" data-plan="${esc(quick.id)}" data-billing="${quick.billing}" data-open="1">✍️ Sign them up: ${esc(quick.name)}, ${esc(quick.termLabel)} · ${money(quick.monthly)}/mo</button>
            <p class="small muted" style="margin:6px 0 0">Opens the agreement on this phone. Their name and email are filled in; they read the short version, sign, and pay. Three taps. <button class="linkbtn" type="button" data-signup-more>Change plan or way to pay</button></p></div>` : ""}
          <div id="signupmore"${!signed && quick ? " hidden" : ""}><p class="small muted">${signed ? "Send a new link to change plans." : "Pick a plan. They choose how to pay (yearly, month to month or the standard term), sign with their name and set up automatic payment, on your phone or theirs."}</p><p class="small muted">${feeNote(payTerms(meta.settings))}</p>
          <p><a class="btn btn--small" href="#/plans/${l.id}">📋 Show them the plans</a> ${l.status === "ready" ? `<a class="btn btn--small" href="#/showboard/${l.id}">📋 Show them the ${esc(l.boardName || "Stock board")}</a> ` : ""}<a class="btn btn--small" href="/api/contract?lead=${l.id}" target="_blank" rel="noopener">📄 Show them the agreement</a> <a class="btn btn--small" href="/api/contract.pdf?lead=${l.id}">⬇ Agreement PDF</a> <a class="btn btn--small" href="/api/ach.pdf?lead=${l.id}">🏦 Payment authorization form</a></p>
          <div class="btns btns--full">${plans.map((p) => `<button class="btn${p.id === "plus" ? " btn--primary" : ""}" data-plan="${p.id}">${esc(p.name)} · ${money(p.monthly)}/mo</button>`).join("")}</div></div>
          <div id="signuplink"></div>`
        : isOwner() ? `<p class="small muted">Add your plans and prices in <a href="#/settings">Settings</a> first.</p>` : `<p class="small muted">The owner hasn't set up plans yet.</p>`}
      </section>`;
  }

  /** After handing off to the Tap to Pay screen, re-check the lead until the sign-up shows paid (10 minutes at most). */
  let tapWatch = null;
  function watchTap(leadId, signupId, after) {
    clearInterval(tapWatch);
    const until = Date.now() + 10 * 60 * 1000;
    const check = async () => {
      if (Date.now() > until || !location.hash.includes(leadId)) { clearInterval(tapWatch); return; }
      try {
        const l = await api("/leads/" + leadId);
        const s = (l.signups || []).find((x) => x.id === signupId);
        if (s && s.paid) { clearInterval(tapWatch); toast("Paid ✅"); after(); }
      } catch (e) { /* offline for a moment */ }
    };
    tapWatch = setInterval(check, 3000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) check(); }, { once: true });
  }

  function bindSignup(l, after) {
    const card = document.getElementById("signupcard");
    if (!card) return;
    card.querySelectorAll("[data-paid]").forEach((c) => c.addEventListener("change", async () => {
      try { await api(`/leads/${l.id}/paid`, { method: "POST", json: { signupId: c.dataset.paid, paid: c.checked } }); toast(c.checked ? "Marked as paid" : "Marked as not paid"); } catch (err) { toast(err.message); }
    }));
    card.querySelectorAll("[data-tap]").forEach((b) => b.addEventListener("click", async () => {
      b.disabled = true;
      try {
        const res = await api(`/leads/${l.id}/tap`, { method: "POST", json: { signupId: b.dataset.tap } });
        if (res.alreadyPaid) { toast("Already paid ✅"); after(); return; }
        toast(`Hand the phone over: ${money(res.amountCents / 100)} by tap`);
        watchTap(l.id, b.dataset.tap, after);
        location.href = res.intentUrl;
      } catch (err) { toast(err.message); } finally { b.disabled = false; }
    }));
    const more = card.querySelector("[data-signup-more]");
    if (more) more.addEventListener("click", () => { const box = card.querySelector("#signupmore"); box.hidden = !box.hidden; more.textContent = box.hidden ? "Change plan or way to pay" : "Hide the other choices"; });
    card.querySelectorAll("[data-plan]").forEach((b) => b.addEventListener("click", async () => {
      b.disabled = true;
      // The quick button opens the sign-up page straight away (a window opened on the tap itself isn't blocked).
      const win = b.dataset.open ? window.open("", "_blank") : null;
      try {
        const res = await api(`/leads/${l.id}/signup`, { method: "POST", json: { plan: b.dataset.plan } });
        if (b.dataset.open) {
          const url = tapHref(res.url + (res.url.includes("?") ? "&" : "?") + "billing=" + encodeURIComponent(b.dataset.billing || "standard"));
          if (win) win.location = url; else location.href = url;
          toast("Hand them the phone to read, sign and pay.");
          return;
        }
        const phone = phoneDigits(l);
        const sms = `${greeting()} Here's the sign-up page for your new website (${res.plan} plan) for ${l.record ? l.record.name : l.name}: ${res.url}`;
        card.querySelector("#signuplink").innerHTML = `<div class="linkbox"><p class="small"><strong>${esc(res.plan)}</strong> sign-up link ready (works ${res.expiresInDays} days).</p>
          <div class="btns btns--full"><a class="btn btn--primary" href="${esc(tapHref(res.url))}" target="_blank" rel="noopener">Open here</a>
          <a class="btn" href="sms:+1${phone}?body=${encodeURIComponent(sms)}">Text it</a><button class="btn" type="button" data-copy>Copy</button></div>
          <p class="small muted">“Open here” lets them sign on your phone right now.</p></div>`;
        card.querySelector("[data-copy]").addEventListener("click", async () => { try { await navigator.clipboard.writeText(res.url); toast("Link copied"); } catch (e) { toast("Couldn't copy"); } });
      } catch (err) { if (win) win.close(); toast(err.message); } finally { b.disabled = false; }
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
        <a class="btn" href="/api/leads/${l.id}/window" target="_blank" rel="noopener">Window sign (QR)</a>
        <a class="btn" href="/api/leads/${l.id}/pricetags.pdf" target="_blank" rel="noopener">QR price tags</a></div>
      <h3 style="margin-top:16px">📊 Google Analytics</h3>
      ${analyticsHtml(l)}
      <h3 style="margin-top:16px">Their own domain</h3>
      <div id="domain"><p class="muted small">Checking…</p></div></section>`;
  }

  // Google Analytics on the live site (src/worker/analytics.ts): the ID, the reports link and sharing with the owner.
  function analyticsHtml(l) {
    const a = l.analytics;
    if (!a) return `<p class="small muted">Not on this site yet. It's added by itself when the site is published once Google Analytics is connected (Settings → Website).</p>
      <div class="btns"><button class="btn btn--small" type="button" data-ga-now>Set it up now</button></div>`;
    return `<p class="small">On every page of the live site: <strong>${esc(a.id)}</strong>${a.auto ? " (made by the app)" : " (their own)"}.</p>
      <div class="btns">${a.reportsUrl ? `<a class="btn btn--small" href="${esc(a.reportsUrl)}" target="_blank" rel="noopener">Open their reports</a><button class="btn btn--small" type="button" data-ga-access>Give the owner access</button>` : ""}</div>
      ${a.auto ? `<p class="small muted">Give the owner access with their Google (Gmail) address and they can open their own reports at analytics.google.com.</p>` : ""}`;
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
          ${d.status === "active" ? "" : `<p class="small">Where the domain lives (our Cloudflare if we bought it, else their GoDaddy, Namecheap…), add this DNS record:</p>
          <p class="small"><code>CNAME</code> · name <code>${esc(d.domain.split(".").length > 2 ? d.domain.split(".")[0] : "@")}</code> · value <code>${esc(d.target)}</code></p>
          <p class="small muted">${d.domain.split(".").length > 2 ? "" : "A bare domain (no www) works best if the domain uses Cloudflare's nameservers. Using www.yourdomain.com is easiest. "}It can take a few hours. HTTPS is set up automatically. Until it works, the site keeps its .pages.dev address; it switches by itself (checked every 5 minutes) and you get an alert.${d.error ? " Last check: " + esc(d.error) : ""}</p>`}
          <div class="btns"><button class="btn btn--small" data-dom="check">Check again</button><button class="btn btn--small btn--danger" data-dom="remove">Remove</button></div>`
        : `<form id="domf" class="row"><label class="field" style="margin:0"><span class="sr-only">Domain</span><input name="domain" placeholder="www.theirbusiness.com" autocapitalize="off" autocomplete="off" inputmode="url"></label><button class="btn" style="flex:none">Add</button></form>
          <p class="small muted">Three ways: the free .pages.dev address (nothing to add), a domain they buy in their name (about $10–15 a year at Cloudflare, GoDaddy or Namecheap), or we buy it in their name on our Cloudflare (the Domain name extra on their order; included with Pro). Either way it's theirs. Then add it here.</p>`;
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

  /** Edit card names for the Finish & publish checklist (editform card ids; the web editor tags its cards the same). */
  const CARD_NAME = { confirm: "Confirm with the owner", approved: "Text → approved", photo: "Photo", gallery: "Photo gallery", facts: "Facts", links: "Links", text: "Text", menu: "Menu", services: "Services", quotes: "Customer quotes", design: "Design", pricelist: "Live price list", restaurant: "Restaurant details", retail: "Shop details", print: "Print shop details", parts: "Auto parts details", auto: "Auto shop details", finance: "Tax & finance details", church: "Church & nonprofit details", contractor: "Contractor details", landscaping: "Lawn & landscape details", cleaning: "Cleaning details", salon: "Salon details", plans: "Plans & pricing", es: "Spanish page" };

  // Starting points for "Describe the style they want" (the art director takes any words).
const STYLE_IDEAS = ["Hippie, groovy 70s", "Bright and happy, a kids' play world", "Clean and businesslike", "Rustic country", "Bold and modern", "Elegant and upscale", "Beachy and relaxed", "Vintage diner"];

async function viewLead(id, intent) {
    setNav("home");
    const my = renderSeq;
    const l = await api("/leads/" + id);
    if (stale(my)) return;
    const r = l.record;
    const lint = l.lint || { publishBlockers: [], errors: [], warnings: [], todos: [], suggestions: [] };
    const blockers = [...lint.errors, ...lint.publishBlockers];
    const ready = l.status === "ready";
    const dnaName = (k) => { const o = (l.dnaOrder || []).find((x) => x.id === k); const v = o && o.values.find((v) => v.id === (l.dna || {})[k]); return v ? v.name : ""; };
    const lookName = [(l.looks.find((x) => x.id === l.lookBase) || {}).name, ((l.layouts || []).find((x) => x.id === l.layout) || {}).name, dnaName("hero")].filter(Boolean).join(" · ");
    const owner = isOwner();
    const work = !!meta.me; // every team member works the lead; `owner` only guards delete and the practice reset
    const open = l.salesStatus === "new" || l.salesStatus === "shown";
    // Cards by name, then composed by stage: what this lead needs now sits above the fold; the rest folds under "More".
    const items = l.checklist || blockers.map((b) => ({ text: b, card: "text", kind: "todo" }));
    const C = {};
    C.head = `<section class="card">
        <h1>${esc(r ? r.name : l.name)}</h1>
        <p class="muted">${esc(l.variantLabel || CATEGORY_LABEL[l.category] || "")} · ${esc(l.reason || "")}${work && l.salesStatus !== "live" ? ` <button class="btn btn--small" type="button" data-act="webcheck" title="Search the web for a page Google doesn't show">🔎 Re-check website</button>${l.notOnGoogle ? "" : ` <button class="btn btn--small" type="button" data-act="googleimport" title="Pull the latest hours, phone, rating, payment and parking info and photo from their Google listing, then rewrite the text">🔄 Import from their Google page</button>`}` : ""}</p>${l.notOnGoogle ? `<p class="small" style="color:var(--warn)">📍 Not on Google Maps. This site was built from what was typed in: check every detail with the owner, and offer the Google profile setup so customers can find them on Maps.</p>` : ""}${l.googleImportedAt ? `<p class="small muted">Refreshed from their Google page ${esc(new Date(l.googleImportedAt).toLocaleDateString())}.</p>` : ""}${foundLine(l)}
        ${l.rating ? `<p><span class="stars">★ ${l.rating.toFixed(1)}</span> on Google</p>` : ""}
        <p>${esc(l.address || "")}</p>
        <div id="askbox"></div>
        <div class="btns btns--full">
          ${ready ? `<a class="btn btn--primary" href="#/pitch/${l.id}">📞 Call guide</a>` : ""}
          ${ready && open ? `<a class="btn btn--primary" href="#/walkin/${l.id}">🚶 In-person guide</a>` : ""}
          <a class="btn${ready ? "" : " btn--primary"}" href="${telHref(phoneDigits(l))}">📞 Call ${esc(r ? r.phone.display : l.phone)}</a>
          ${r ? `<a class="btn" href="${esc(r.mapsUrl)}" target="_blank" rel="noopener">Google listing</a>` : ""}
          ${open ? `<a class="btn" href="#/playbook">💬 Plans & answers</a>` : ""}
          <a class="btn" href="#/tasks/${l.id}">📝 Task</a>
        </div>
      </section>`;
    C.step = nextStepCardHtml(l);
    C.client = clientCardHtml(l);
    C.status = `<section class="card"><h2>Sales status</h2>
        ${l.salesStatus === "live"
          ? `<p class="chip chip--good">● Live</p>`
          : work ? `<div class="tabs">${[["new", "New"], ["shown", "Shown"], ["sold", "Sold"], ["not_interested", "Not interested"]].map(([k, t]) => `<button type="button" data-status="${k}" class="${l.salesStatus === k ? "is-on" : ""}">${t}</button>`).join("")}</div>`
          : `<p class="chip${l.salesStatus === "sold" ? " chip--good" : ""}">${esc({ new: "New", shown: "Shown", sold: "Sold", not_interested: "Not interested" }[l.salesStatus] || l.salesStatus)}</p><p class="small muted" style="margin:6px 0 0">Log the call below to update it.</p>`}
        ${l.cadence && open && ready ? `<div class="cadence"><p><strong>Day ${Number(l.cadence.day)} since shown</strong> · Next: ${esc(l.cadence.next || "")}</p><div class="btns">${cadenceAction(l, l.cadence.next)}</div></div>` : ""}
      </section>`;
    C.website = `<section class="card"><h2>Website</h2>
        ${l.status === "failed" ? `<p class="chip chip--bad">Build failed</p><p class="small muted">${esc(l.error || "")}</p>${work ? `<button class="btn" data-act="retry">Try again</button>` : `<p class="small muted">The owner can rebuild it.</p>`}` : ""}
        ${l.status === "queued" || l.status === "building" ? `<p><span class="spin"></span> Building… this takes about a minute.</p>` : ""}
        ${ready ? `${work && l.salesStatus !== "live" ? "" : `<p class="muted small">Design: ${esc(lookName)}</p>`}
          <div class="btns btns--full">
            <a class="btn btn--primary" href="#/preview/${l.id}">Preview</a>
            <a class="btn" href="#/full/${l.id}">Open full screen</a>
            ${work ? `<a class="btn" href="#/edit/${l.id}">Edit</a>` : ""}
            ${l.salesStatus !== "live" ? `<button class="btn" type="button" data-flyer="${l.id}">Leave-behind flyer (QR)</button>` : ""}
          </div>
          ${l.salesStatus !== "live" ? `<div style="margin-top:10px">${shareButtonsHtml(l)}</div>` : ""}
          ${l.salesStatus !== "live" ? `<div class="flyercode" data-mailcode-box style="margin-top:12px">${mailCodeHtml(l)}</div>` : ""}
          ${l.previewOpens ? `<p class="small" style="margin-top:8px">👀 They opened their preview ${l.previewOpens === 1 ? "once" : `${l.previewOpens} times`}, last ${ago(l.previewOpenedAt)}.</p>` : ""}` : ""}
        ${l.liveUrl ? `<p style="margin-top:12px">Live at <a href="${esc(l.liveUrl)}" target="_blank" rel="noopener">${esc(l.liveUrl.replace("https://", ""))}</a></p>` : ""}
      </section>`;
    C.design = `${ready && work && l.salesStatus !== "live" ? `<section class="card"><h2>🎨 Design</h2>
        <p class="small muted">Now: ${esc(lookName)}</p>
        ${l.designNotes ? `<p class="small" style="margin:0 0 10px">✨ ${l.designNotes.asked ? `Asked for “${esc(l.designNotes.asked)}”: ` : ""}<strong>${esc(l.designNotes.concept)}.</strong> ${esc(l.designNotes.why)}</p>` : ""}
        ${l.salesStatus === "sold" ? `<p class="small" style="margin:0 0 10px">🔒 Sold: this design is ${esc(l.name)}'s alone now. No other business gets these colors, and any open preview that shared them was given a new design.</p>` : ""}
        <div class="btns btns--full"><button class="btn btn--primary" type="button" data-act="restyle">Try another design</button><button class="btn" type="button" data-act="restructure">Same colors, new structure</button></div>
        <form id="briefForm" style="margin-top:12px"><label class="field small" style="margin:0"><strong>Or describe the style they want</strong><input name="brief" maxlength="200" placeholder="e.g. hippie, bright and happy kids' play world" autocomplete="off"></label>
          <div class="row" style="flex-wrap:wrap;gap:6px;margin:6px 0">${STYLE_IDEAS.map((x) => `<button class="btn btn--small" type="button" data-brief="${esc(x)}">${esc(x)}</button>`).join("")}</div>
          <label class="small" style="display:flex;gap:6px;align-items:center;margin:4px 0 8px"><input type="checkbox" name="rewrite" checked style="width:auto;min-height:0"> Also rewrite the words to match</label>
          <button class="btn btn--primary" type="submit">✨ Design it</button></form>
        ${(l.dnaRecipes || []).length ? `<p class="small" style="margin:12px 0 6px"><strong>Or pick a style</strong> (keeps the colors)</p><div class="row" style="flex-wrap:wrap;gap:6px">${l.dnaRecipes.map((x) => `<button class="btn btn--small" type="button" data-recipe="${esc(x.id)}" title="${esc(x.about)}">${esc(x.name)}</button>`).join("")}</div>` : ""}
        <label class="field small" style="margin-top:12px">Colors &amp; fonts<select data-look>${l.looks.map((x) => `<option value="${esc(x.id)}"${x.id === l.lookBase ? " selected" : ""}${x.soldTo && x.id !== l.lookBase ? " disabled" : ""}>${esc(x.name)}${x.soldTo ? ` (sold: ${esc(x.soldTo)})` : ""}</option>`).join("")}</select></label>
        ${(l.looks || []).some((x) => x.soldTo) ? `<p class="small muted" style="margin:6px 0 0">Looks marked "sold" belong to a client now and can't be used for anyone else.</p>` : ""}
        <p class="small muted" style="margin:8px 0 0">Every part (layout, opening, buttons, services…) can be set by hand in <a href="#/edit/${l.id}">Edit → Design</a>.</p>
      </section>` : ""}`;
    C.notes = `<section class="card"><h2>Calls &amp; notes</h2>
        ${l.followUp && open ? `<div class="row" style="margin-bottom:8px">${followChip(l.followUp)}<button class="linkbtn" data-act="clearfollow" style="flex:none">Clear</button></div>` : ""}
        ${notesHtml(l, 0, true)}
      </section>`;
    C.signup = ready ? signupCardHtml(l) : "";
    C.referral = referralCardHtml(l);
    C.live = l.salesStatus === "live" && work ? liveCardHtml(l) : "";
    C.gbp = (l.salesStatus === "live" || l.salesStatus === "sold") && work && ready ? gbpCardHtml(l) : "";
    C.extras = `${l.salesStatus === "live" || l.salesStatus === "sold" ? `<section class="card"><h2>🛒 Extras</h2><p class="small muted">Text them a link to add extras (photo shoot, Spanish page, social posts…) and pay${meta.checkout && meta.checkout.online ? " online" : ""}. Good for 30 days.</p>
        <div class="btns btns--full"><button class="btn" type="button" data-extraslink>💬 Text “Buy extras” link</button></div></section>` : ""}`;
    C.review = l.salesStatus === "live" || l.salesStatus === "sold" ? reviewAskHtml() : "";
    C.billing = `${(l.salesStatus === "live" || l.salesStatus === "sold") && work ? `<section class="card"><h2>💳 Billing</h2><p class="small muted">Their Stripe billing portal: update the card, see invoices, change or cancel the subscription.</p>
        <div class="btns btns--full"><button class="btn" type="button" data-act="portal">Open billing portal</button></div></section>` : ""}`;
    C.log = `<div id="logslot-side">${l.salesStatus !== "live" ? logCardHtml(l) : ""}</div>`;
    C.publish = ready && work ? `<section class="card" id="publishcard"><h2>${items.length ? `🚀 Finish &amp; publish · ${items.length} to fix` : "🚀 Ready to publish"}</h2>
        ${items.length ? `<ol class="checklist">${items.map((it) => `<li><a href="#/edit/${l.id}/${esc(it.card)}">${esc(it.text)}</a><span class="small muted"> → Edit · ${esc(CARD_NAME[it.card] || it.card)}</span></li>`).join("")}</ol><p class="small muted">Each line opens the right card in Edit. Publish unlocks when the list is empty.</p>` : `<p class="muted">Everything's confirmed. Publishing puts the site on the internet.</p>`}
        ${(lint.suggestions || []).length ? `<details class="more"><summary>Good to add (talking points, ${lint.suggestions.length})</summary><ul class="list small">${lint.suggestions.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></details>` : ""}
        <div class="btns btns--full">
          <button class="btn btn--good" data-act="publish"${items.length ? " disabled" : ""}>${l.liveUrl ? "Republish changes" : "Publish to Cloudflare"}</button>
          <button class="btn" data-act="zip"${items.length ? " disabled" : ""}>Download zip</button>
        </div></section>` : "";
    C.practice = `${l.payTest ? `<section class="card" style="border:2px solid #fca311"><h2>🎓 Practice lead</h2>
        <p class="small">This is the training aid, not a real business. Take it from New to Live the way you would a real sale: every payment on it is <strong>$1</strong>, it never expires, and it never counts in Sales. The full run-through is the last lesson in Training.</p>
        ${owner ? `<p class="small">When a trainee is done: <button class="btn btn--small" type="button" data-practice-reset>🔁 Reset for the next run</button> <span class="muted">refunds their $1, clears the sign-ups, call log and tasks, takes down anything published, forgets board links and photos, and puts fresh sample items back.</span></p>` : `<p class="small muted">When you're done, the owner resets it for the next person.</p>`}</section>` : ""}`;
    C.board = `${ready ? `<section class="card"><h2>📋 ${esc(l.boardName || "Stock board")}</h2>
        <p class="muted small">Their own page for what's in each tank, case, bench or shelf: name, price, how many, a photo, sold out. No login. Changes show on the website's price page within a minute, and the QR price tags point at it. Set "What's on it" in Edit → Live price list.</p>
        <div class="btns btns--full"><button class="btn" type="button" data-clientlink>💬 Text them their ${esc((l.boardName || "Stock board").toLowerCase())} link</button><button class="btn" type="button" data-clientlink="open">Open it here</button><button class="btn" type="button" data-lookuplink>🔎 Text them the stock lookup</button><button class="btn" type="button" data-lookuplink="open">Open the lookup here</button><button class="btn" type="button" data-textpitch-lead>💬 Text them the ${esc(l.boardName || "Stock board")} page</button>${work ? `<button class="btn btn--small" type="button" data-clientrevoke>Revoke old links</button>` : ""}</div>
        ${work ? `<p class="small" style="margin-top:8px">${l.sampleStock ? `🧪 <strong>Sample items are on the price list</strong> (preview only; publishing is blocked until they go). ` : `Showing it to someone interested? Fill the preview's price page, board and tablet with made-up stock for their kind of business. `}<button class="btn btn--small" type="button" data-samplestock="${l.sampleStock ? "remove" : "add"}">${l.sampleStock ? "Remove sample items" : "🧪 Add sample items (preview only)"}</button></p>` : ""}
        <p class="muted small">A tablet beside a tank, case or shelf shows it live and lets staff update it (the 📺 link on each one in the board). Sell it as the <strong>Price list</strong> plan when they don't want a whole website.</p></section>` : ""}`;
    C.more = `${work ? `<section class="card"><h2>More</h2><div class="btns">
        ${ready ? `<button class="btn btn--small" data-act="rewrite">Rewrite text with AI</button>` : ""}
        ${owner && l.salesStatus !== "live" ? `<button class="btn btn--small btn--danger" data-act="delete">Delete lead</button>` : ""}
      </div></section>` : ""}`;
    const stage = l.salesStatus === "live" ? "live" : l.salesStatus === "sold" ? "sold" : l.salesStatus === "not_interested" ? "closed" : "open";
    const LAYOUT = {
      open:   { left: ["head", "step", "practice", "logtop", "website", "status", "notes"], right: ["signup", "log"], more: ["design", "board", "referral", "more"] },
      sold:   { left: ["head", "step", "practice", "client", "logtop", "publish", "website", "notes"], right: ["signup", "log"], more: ["status", "design", "referral", "gbp", "extras", "review", "billing", "board", "more"] },
      live:   { left: ["head", "step", "practice", "client", "live", "website", "notes"], right: ["review", "extras", "billing", "gbp"], more: ["signup", "referral", "board", "publish", "more"] },
      closed: { left: ["head", "step", "practice", "logtop", "status", "website", "notes"], right: ["log"], more: ["signup", "design", "board", "referral", "more"] },
    }[stage];
    C.logtop = `<div id="logslot-top"></div>`;
    // A shop that uses the inventory system (items on its price list) gets the board card up top, not under More.
    if ((l.priceListItems || 0) > 0 && LAYOUT.more.includes("board")) { LAYOUT.more = LAYOUT.more.filter((k) => k !== "board"); LAYOUT.right = [...LAYOUT.right, "board"]; }
    const pick = (keys) => keys.map((k) => C[k] || "").join("");
    const moreHtml = pick(LAYOUT.more).trim();
    $app.innerHTML = `<p><a href="#/">← Leads</a></p>
      <div class="split"><div>${pick(LAYOUT.left)}</div><div>${pick(LAYOUT.right)}
      ${moreHtml ? `<details class="more-cards" id="morecards"><summary>More on this lead</summary>${moreHtml}</details>` : ""}</div></div>`;
    const reload = () => viewLead(id);
    bindLog(l, reload);
    bindNotes(l, reload);
    bindSignup(l, reload);
    bindReferral(l, reload);
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
    const bf = $app.querySelector("#briefForm");
    if (bf) {
      bf.querySelectorAll("[data-brief]").forEach((b) => b.addEventListener("click", () => { bf.brief.value = b.dataset.brief; bf.brief.focus(); }));
      bf.addEventListener("submit", async (e) => {
        e.preventDefault();
        const brief = bf.brief.value.trim();
        if (!brief) { toast("Type the style they want first"); bf.brief.focus(); return; }
        const btn = bf.querySelector("[type=submit]");
        btn.disabled = true; btn.textContent = "Designing…";
        try {
          const r = await api(`/leads/${id}/restyle`, { method: "POST", json: { brief, rewrite: bf.rewrite.checked } });
          toast(r.rewriting ? `${r.concept || "New design"} ready. Rewriting the words to match (about a minute)…` : `${r.concept || "New design"} ready`);
          viewLead(id);
        } catch (err) { btn.disabled = false; btn.textContent = "✨ Design it"; throw err; }
      });
    }
    act("restyle", async () => { await api(`/leads/${id}/restyle`, { method: "POST" }); toast("New design ready"); viewLead(id); });
    act("googleimport", async () => { const r = await api(`/leads/${id}/googleimport`, { method: "POST" }); toast(r.changed.length ? "Updated: " + r.changed.join(", ") + ". Rewriting…" : "Nothing new on Google. Rewriting with the latest summary…"); setTimeout(() => viewLead(id), 1500); });
    act("webcheck", async () => { const r = await api(`/leads/${id}/webcheck`, { method: "POST" }); toast(r.found ? `Found: ${r.label}` : "Nothing found beyond their Google listing"); viewLead(id); });
    act("restructure", async () => { await api(`/leads/${id}/restyle`, { method: "POST", json: { structureOnly: true } }); toast("New structure ready"); viewLead(id); });
    $app.querySelectorAll("[data-recipe]").forEach((b) => b.addEventListener("click", async () => {
      b.disabled = true;
      try { await api(`/leads/${id}/restyle`, { method: "POST", json: { recipe: b.dataset.recipe } }); toast(`${b.textContent} ready`); viewLead(id); }
      catch (e) { b.disabled = false; throw e; }
    }));
    const lookSel = $app.querySelector("[data-look]");
    if (lookSel) lookSel.addEventListener("change", async () => {
      // Keep the layout and structure; only the colors and fonts change.
      const code = (l.dnaOrder || []).map((k) => k.letter + Math.max(0, k.values.findIndex((v) => v.id === ((l.dna || {})[k.id] || k.values[0].id)))).join("");
      lookSel.disabled = true;
      try { await api(`/leads/${id}/edits`, { method: "PUT", json: { look: `${lookSel.value}~${l.layout || "classic"}~${code}` } }); toast("Colors changed"); viewLead(id); }
      catch (e) { lookSel.disabled = false; throw e; }
    });
    if (work) act("retry", async () => { await api(`/leads/${id}/retry`, { method: "POST" }); toast("Rebuilding…"); setTimeout(() => viewLead(id), 1500); });
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
    // The next-step button (and #/lead/<id>/<route> from Home's queue): act on the right card, opening "More" if it's in there.
    const reveal = (el) => { if (!el) return false; const d = el.closest("details"); if (d) d.open = true; el.scrollIntoView({ behavior: "smooth", block: "start" }); el.classList.add("is-jump"); setTimeout(() => el.classList.remove("is-jump"), 2500); return true; };
    const doStep = (route) => {
      if (route === "pay") { const card = document.getElementById("signupcard"); reveal(card); const tap = card && card.querySelector("[data-tap]"); if (tap) tap.click(); else if (card && !card.querySelector(".signed")) toast("Sign them up first; payment comes right after the signature."); else toast("Tap to Pay needs the Android app; here, tick “Payment is set up” once they've paid, or text them the sign-up link again."); }
      else if (route === "text") { const f = $app.querySelector("[data-share] + p + details"); if (f) { f.open = true; reveal(f); } else reveal($app.querySelector("[data-share]")) || reveal(document.getElementById("signupcard")); }
      else if (route === "checklist") reveal(document.getElementById("publishcard"));
      else if (route === "publish") { const b = $app.querySelector("[data-act=publish]"); if (b && !b.disabled) b.click(); else reveal(document.getElementById("publishcard")); }
      else if (route === "review") { const b = $app.querySelector("[data-askreview]"); if (b) { reveal(b.closest("section")); b.click(); } else toast(isOwner() ? "Add the Google review link in Settings first." : "The owner hasn't added the review link yet."); }
      else if (route === "retry") { const b = $app.querySelector("[data-act=retry]"); if (b) b.click(); }
      else if (route === "log") reveal(document.getElementById("logcard"));
    };
    $app.querySelectorAll("[data-step]").forEach((b) => b.addEventListener("click", () => doStep(b.dataset.step)));
    if (intent) { history.replaceState(null, "", `#/lead/${id}`); lastHash = `#/lead/${id}`; setTimeout(() => doStep(intent), 150); }
    if (l.status === "queued" || l.status === "building") pollTimer = setTimeout(() => location.hash === `#/lead/${id}` && viewLead(id), 5000);
  }

  // Flyer: POST marks the lead Shown (callers may), then the printable page opens in a new tab (GET has no side effects).
  // Older servers mark Shown on the GET itself, so a 404 on the POST is fine.
  function bindFlyer() {
    $app.querySelectorAll("[data-mailcode]").forEach((b) => b.addEventListener("click", async () => {
      b.disabled = true;
      try {
        const r = await api(`/leads/${b.dataset.mailcode}/mailcode`, { method: "POST" });
        const box = b.closest("[data-mailcode-box]");
        if (box) box.innerHTML = mailCodeHtml({ mailCode: r.code, mailOpens: 0 });
      } catch (err) { toast(err.message); b.disabled = false; }
    }));
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
    const owner = isOwner();
    let mode = matchMedia("(min-width: 760px)").matches ? "desktop" : "phone";
    $app.innerHTML = `<p><a href="#/lead/${id}">← Details</a></p>
      <div class="row" style="margin-bottom:10px"><div class="tabs" style="margin:0">
        <button type="button" data-mode="phone">Phone view</button><button type="button" data-mode="desktop">Desktop view</button></div>
        <a class="btn btn--small" href="#/full/${id}" style="flex:none">Full screen</a><button class="btn btn--small btn--line" type="button" id="notesbtn" style="flex:none" title="Our to-do notes (missing hours, photos…). The business owner never sees them.">📝 Show notes</button><span id="previewsample" style="flex:none"></span></div>
      <div class="frame-wrap" id="fw"><iframe id="pf" title="Site preview" src="/p/${id}/"></iframe></div>
      <div id="previewshare" style="margin-top:12px"></div>`;
    const my = renderSeq;
    // The to-do notes are hidden on every preview so the owner sees a finished site; this shows them for us.
    let notesOn = false;
    document.getElementById("notesbtn").addEventListener("click", (e) => {
      notesOn = !notesOn;
      e.currentTarget.textContent = notesOn ? "📝 Hide notes" : "📝 Show notes";
      e.currentTarget.classList.toggle("btn--line", !notesOn);
      const f = document.getElementById("pf");
      f.src = `/p/${id}/?notes=${notesOn ? 1 : 0}`;
    });
    api("/leads/" + id).then((l) => {
      const box = document.getElementById("previewshare");
      if (stale(my)) return;
      const sb = document.getElementById("previewsample");
      if (sb && l.status === "ready" && l.salesStatus !== "live") {
        const draw = (on) => {
          sb.innerHTML = `<button class="btn btn--small${on ? "" : " btn--line"}" type="button" title="${on ? "Sample items are on the price list (preview only)" : "Fill the price page, board and tablet with made-up stock for their kind of business"}">${on ? "🧪 Remove sample items" : "🧪 Add sample items"}</button>`;
          sb.firstChild.addEventListener("click", async () => {
            if (on && !confirm("Remove every sample item from the price list? Anything they typed themselves stays.")) return;
            sb.firstChild.disabled = true; sb.firstChild.textContent = on ? "Removing…" : "Adding…";
            try {
              await api(`/leads/${id}/samplestock`, { method: on ? "DELETE" : "POST" });
              toast(on ? "Sample items removed. Rebuilding the preview…" : "Sample items added. Rebuilding the preview…");
              setTimeout(() => { if (!stale(my)) { frame.src = `/p/${id}/${on ? "" : "prices/"}`; draw(!on); } }, 3500);
            } catch (err) { toast(err.message); draw(on); }
          });
        };
        draw(!!l.sampleStock);
      }
      if (!box || l.status !== "ready" || l.salesStatus === "live") return;
      box.innerHTML = shareButtonsHtml(l);
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
  // Photo framing choices (editform.ts FOCUS_OPTIONS / ZOOM_OPTIONS hold the same lists for the phone app).
  const FOCUS_OPTIONS = [["", "The middle"], ["50% 0%", "The top"], ["50% 30%", "Upper middle"], ["50% 70%", "Lower middle"], ["50% 100%", "The bottom"], ["0% 50%", "The left side"], ["100% 50%", "The right side"]];
  const ZOOM_OPTIONS = [["", "No zoom"], ["1.25", "A little (125%)"], ["1.5", "More (150%)"], ["1.75", "A lot (175%)"], ["2", "The most (200%)"]];
  const optsWith = (opts, cur) => (cur && !opts.some(([v]) => v === cur) ? opts.concat([[cur, `As set (${cur})`]]) : opts).map(([v, t]) => `<option value="${esc(v)}"${v === (cur || "") ? " selected" : ""}>${esc(t)}</option>`).join("");
  function photoCardHtml(r, id) {
    const h = r.media.hero;
    return `<section class="card" id="card-photo"><h2>Photo</h2>
        <p class="small muted">${h && h.source === "google" ? "Using a Google photo (fine for the preview, but it must be replaced before publishing)." : h ? "Using the owner's photo." : "No photo of their own yet: the site uses a stock photo (see Stock photos)."}</p>
        ${h && id ? `<img src="/p/${id}${esc(h.src)}" alt="" style="width:100%;max-width:320px;border-radius:10px;display:block;margin:0 0 8px">` : ""}
        ${h ? `<label class="field">Keep in view <span class="hint">when the photo is cropped</span><select name="heroFocus">${optsWith(FOCUS_OPTIONS, h.focus || "")}</select></label>
        <label class="field">Zoom in on phones <span class="hint">so a sign or detail is big enough to read</span><select name="heroZoom">${optsWith(ZOOM_OPTIONS, h.zoomPhone ? String(h.zoomPhone) : "")}</select></label>
        ${h.source !== "google" ? `<button class="linkbtn" type="button" data-eact="delhero">Remove main photo</button>` : ""}` : ""}
        <label class="field">Main photo<input type="file" id="photo" accept="image/*"></label>
        <label class="field">Describe the photo<input id="photoAlt" placeholder="e.g. Freshly mowed front lawn in Cullman"></label>
        <button class="btn btn--small" type="button" data-eact="upload">Upload photo</button>
      </section>`;
  }
  function stockCardHtml(id, l) {
    const list = l.stockPhotos || [];
    if (!list.length) return `<section class="card" id="card-stock" hidden></section>`;
    return `<section class="card" id="card-stock"><h2>Stock photos</h2>
        <p class="small muted">Pictures from our free photo library that fill in where the business has no photo of its own (the main photo, a wide photo strip, the closing section). Tick one off and the next best one takes its place. Their own photos always come first.</p>
        <ul class="thumbs" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr))">${list.map((s) => `<li><img src="/p/${id}${esc(s.src)}" alt="${esc(s.alt)}" loading="lazy" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px${s.hidden ? ";opacity:.4" : ""}"><label class="check small"><input type="checkbox" name="noscene_${esc(s.file.replace(/\.jpg$/, ""))}"${s.hidden ? " checked" : ""}> Don't use this one</label></li>`).join("")}</ul>
      </section>`;
  }
  function galleryCardHtml(id, r) {
    return `<section class="card" id="card-gallery"><h2>Photo gallery</h2>
        <p class="small muted">Up to 24 of the owner's own photos (the photo shoot extra): their place, their work, their team. They show as a photo grid on the site.</p>${r.media.gallery.some((p) => p.source === "google") ? `<p class="small muted">${r.media.gallery.filter((p) => p.source === "google").length} of these came from their Google listing (Import from their Google page). They show in the preview only and are left out of the live site. <button class="linkbtn" type="button" data-eact="delphoto" data-photo="google">Remove all Google photos</button></p>` : ""}
        ${r.media.gallery.length ? `<ul class="thumbs" style="grid-template-columns:1fr">${r.media.gallery.map((p) => { const key = photoKey(p.src); return `<li style="text-align:left"><div class="row" style="align-items:flex-start"><img src="/p/${id}${esc(p.src)}" alt="${esc(p.alt)}" loading="lazy" style="width:88px;flex:none"><div style="flex:1;min-width:0"><div class="row"><label class="field">Caption<input name="gcap_${esc(key)}" maxlength="80" value="${esc(p.caption || "")}" placeholder="Patio"></label><label class="field">Town<input name="gtown_${esc(key)}" maxlength="40" value="${esc(p.town || "")}" placeholder="Hanceville"></label></div><label class="check"><input type="checkbox" name="gnew_${esc(key)}"${p.whatsNew ? " checked" : ""}> Show in “What's new” (photo row: swipe or arrows, tap to see it big)</label><label class="field">Keep in view<select name="gfocus_${esc(key)}">${optsWith(FOCUS_OPTIONS, p.focus || "")}</select></label>
            <label class="field">Before/after<select name="gpair_${esc(key)}"><option value="">Not a “before” photo</option>${r.media.gallery.filter((o) => o !== p).map((o) => { const ok = photoKey(o.src); return `<option value="${esc(ok)}"${p.pairWith === ok ? " selected" : ""}>This is the BEFORE of: ${esc(o.caption || o.alt || ok)}</option>`; }).join("")}</select></label>
            <button class="linkbtn" type="button" data-eact="delphoto" data-photo="${esc(key)}">Remove</button></div></div></li>`; }).join("")}</ul>
        <p class="small muted">Captions show under the photo (“Patio, Hanceville”). Pick a photo's “after” to show the two side by side.</p>` : ""}
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

  /** Edit card heading → editform card id, so a checklist line (#/edit/<id>/<card>) can open the right card. */
  const EDIT_CARD_ID = { "Confirm with the owner": "confirm", "Design": "design", "Facts (only if the owner says so)": "facts", "Links": "links", "Text": "text", "Menu": "menu", "Services": "services", "Services & area": "services", "Customer quotes": "quotes", "Photo": "photo", "Photo gallery": "gallery", "Stock photos": "stock", "Spanish page": "es", "We're hiring": "hiring", "Events & specials": "events", "Awards & proof": "proof", "Closures, parking & payment": "visit", "Auto parts details": "parts", "Auto shop details": "auto", "Church & nonprofit details": "church", "Commercial cleaning details": "cleaning", "What's included": "cleaning", "Contractor details": "contractor", "Lawn & landscape details": "landscaping", "Live price list & QR labels": "pricelist", "Kind of business": "kind", "Plans & pricing": "plans", "Print shop details": "print", "Restaurant details": "restaurant", "Shop details": "retail", "Tax & finance details": "finance", "Salon details": "salon", "Massage details": "salon", "Grooming details": "salon", "Their current website": "site", "Their domain name": "domain" };
  function tagEditCards(jumpTo) {
    $app.querySelectorAll("section.card").forEach((card) => {
      const h = card.querySelector(":scope > h2");
      const label = h ? h.textContent.trim() : "";
      const id = EDIT_CARD_ID[label] || (card.querySelector('[name="approved"]') ? "approved" : "");
      if (id) card.dataset.card = id;
    });
    if (!jumpTo) return;
    const card = $app.querySelector(`[data-card="${jumpTo}"]`) || (jumpTo === "approved" && $app.querySelector('[name="approved"]') && $app.querySelector('[name="approved"]').closest("section"));
    if (!card) return;
    const d = card.closest("details") || card.querySelector(":scope > details");
    if (d) d.open = true;
    setTimeout(() => { card.scrollIntoView({ behavior: "smooth", block: "start" }); card.classList.add("is-jump"); setTimeout(() => card.classList.remove("is-jump"), 3000); }, 60);
  }

  async function viewEdit(id, jumpTo) {
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
    const isParts = isA && r.variant === "parts";
    const serviceArea = isC || isL || isK;
    const hasServices = !isR;
    const hasTowns = isC || isL || isK || (isA && !isParts);
    const ext = r.ext[cat] || {};
    const conf = new Set(r.confirmed);
    const t = r.testimonials.concat([{}, {}, {}]).slice(0, 3);
    const cb = (name, label, on) => `<label class="check"><input type="checkbox" name="${name}"${on ? " checked" : ""}> ${label}</label>`;
    const confirmable = [["name", "Business name is right"], ["phone", "Phone number is right"], ["address", "Address is right"]];
    if (r.hours) confirmable.push(["hours", "Hours are right"]);
    if (hasServices) confirmable.push(["services", isS ? "Services and prices are right" : isParts ? "The what-we-carry list is right" : "Services list is right"]);
    if (hasTowns) confirmable.push(["service_area", "Service area towns are right"]);
    if (isR) confirmable.push(["menu", "Menu is right"]);
    if ([r.media.hero].concat(r.media.gallery || []).some((p) => p && p.source === "site")) confirmable.push(["site_photos", "Photos from their old website are theirs (not the site builder's stock)"]);
    const priceOf = (s) => {
      const p = s.price;
      if (!p) return "";
      if (p.mode === "exact") return p.unit === "add-on" ? `+$${p.amount}` : `$${p.amount}`;
      if (p.mode === "from") return `from $${p.amount}`;
      if (p.mode === "range") return `$${p.min}-$${p.max}`;
      if (p.mode === "quote") return "consult";
      return "";
    };
    let lastGroup;
    const serviceLines = r.services.map((s) => {
      const line = isS ? [s.name, priceOf(s), s.durationMin ? `${s.durationMin} min` : ""].join(" | ").replace(/( \|\s*)+$/, "") : s.name;
      if (s.group && s.group !== lastGroup) { lastGroup = s.group; const n = (r.serviceNotes || {})[s.group]; return `# ${s.group}${n ? ` | ${n}` : ""}\n${line}`; }
      return line;
    }).join("\n");
    const lic = r.licenses[0] || {};
    const w = ext.warranty || {};
    $app.innerHTML = `<p><a href="#/lead/${id}">← Details</a></p><h1>Edit ${esc(r.name)}</h1>
    <form id="ef"><div class="grid grid--2"><div>
      <section class="card"><h2>Confirm with the owner</h2>
        <label class="field">Business name<input name="name" value="${esc(r.name)}" required></label>
        <label class="field">Phone<input name="phone" type="tel" value="${esc(r.phone.display)}" required></label>
        <div class="row"><label class="field">Street address<input name="addrStreet" maxlength="120" value="${esc(r.address.street || "")}"></label><label class="field">Town<input name="addrCity" maxlength="60" value="${esc(r.address.city || "")}"></label><label class="field">ZIP<input name="addrZip" maxlength="5" inputmode="numeric" value="${esc(r.address.zip || "")}"></label></div>
        <p class="hint">Moved, or Google has the address wrong? Change it here: the site and its Directions buttons use the new address.</p>
        ${cb("smsEnabled", "This number takes texts", r.smsEnabled)}
        ${serviceArea ? cb("showStreetAddress", "Show the street address (they have a storefront)", r.showStreetAddress) : ""}
        <hr style="border:0;border-top:1px solid var(--line);margin:12px 0">
        ${confirmable.map(([k, label]) => cb("confirm_" + k, label, conf.has(k))).join("")}
      </section>
      ${photoCardHtml(r, id)}
      ${galleryCardHtml(id, r)}
      ${stockCardHtml(id, l)}
      ${esCardHtml(id, c)}
      <section class="card"><h2>We're hiring</h2>
        <p class="small muted">Optional. Adds a “We're hiring” section with Call/Text buttons. Leave the jobs empty to remove it.</p>
        <label class="field">Jobs open (one per line)<textarea name="hiringRoles" rows="3" placeholder="Line cook&#10;Server">${esc(((r.hiring || {}).roles || []).join("\n"))}</textarea></label>
        <label class="field">How to apply<input name="hiringHow" maxlength="240" value="${esc((r.hiring || {}).how || "")}" placeholder="Stop by between 2 and 4, or give us a call."></label>
      </section>
      <section class="card"><h2>Events &amp; specials</h2>
        <p class="small muted">Optional. Dated things in the owner's words: an event, a sale, a coupon, a deadline, a distribution day. One per line as <b>date | title | time | details | link</b>. Dates are YYYY-MM-DD; write <b>2026-11-01..2026-11-30</b> for something that runs for a while. Past items drop off the site on their own.</p>
        <label class="field">Coming up<textarea name="events" rows="4" placeholder="2026-10-25 | Trunk or Treat | 5–7 PM | Candy, games and hot dogs in the parking lot.&#10;2026-11-01..2026-11-30 | $20 off any brake job | | Mention this website.">${esc(eventLines(r.events))}</textarea></label>
      </section>
      <section class="card"><h2>Kind of business</h2><label class="field">Kind<select name="category">${PACKS.map(([k, t]) => `<option value="${k}"${k === l.category ? " selected" : ""}>${esc(t)}</option>`).join("")}</select></label>
        <p class="small muted">Change this when the site was built as the wrong kind (a truck dealer built as a food truck). Rebuilding redoes the sections and text for the new kind; the name, phone, hours, links, the photos you added, awards and the price list stay.</p>
        <button class="btn btn--small" type="button" data-eact="rekind">🔁 Rebuild as this kind</button></section>
      <section class="card"><h2>Design</h2><label class="field">Colors &amp; fonts<select name="lookBase">${l.looks
        .map((x) => `<option value="${esc(x.id)}"${x.id === l.lookBase ? " selected" : ""}${x.soldTo && x.id !== l.lookBase ? " disabled" : ""}>${esc(x.name)}${x.soldTo ? ` (sold: ${esc(x.soldTo)})` : ""}</option>`)
        .join("")}</select></label>
        <label class="field">Layout<select name="layout">${(l.layouts || [])
        .map((x) => `<option value="${esc(x.id)}"${x.id === l.layout ? " selected" : ""}>${esc(x.name)}: ${esc(x.about)}</option>`)
        .join("")}</select></label>
        <h3 style="margin:6px 0 4px">Page structure</h3>
        <p class="small muted">How the page is put together: the opening, the top bar, buttons, how services are shown. Mix these with any colors and layout.</p>
        ${(l.dnaRecipes || []).length ? `<label class="field">Start from a style<select name="dna_recipe" data-recipe-fill><option value="">Keep my picks</option>${l.dnaRecipes.map((x) => `<option value="${esc(x.id)}" data-dna="${esc(JSON.stringify(x.dna))}">${esc(x.name)}: ${esc(x.about)}</option>`).join("")}</select></label>` : ""}
        <div class="row" style="flex-wrap:wrap">${(l.dnaOrder || []).map((k) => `<label class="field" style="flex:1 1 150px">${esc(k.label)}<select name="dna_${esc(k.id)}">${k.values.map((v) => `<option value="${esc(v.id)}"${((l.dna || {})[k.id] || k.values[0].id) === v.id ? " selected" : ""}>${esc(v.name)}</option>`).join("")}</select></label>`).join("")}</div>
        <button class="btn btn--small" type="button" data-act="shuffle">🎲 Surprise me</button></section>
      <section class="card"><h2>Facts (only if the owner says so)</h2>
        <label class="field">Year they started<input name="foundedYear" type="number" inputmode="numeric" min="1800" max="2100" value="${r.foundedYear || ""}"></label>
        ${cb("familyOwned", "Family-owned", r.ownershipTags.includes("family_owned"))}
        ${isS ? `<label class="field">Walk-ins or appointments?<select name="walkIns"><option value="">Not set yet</option>${[["welcome", "Walk-ins welcome"], ["appointment_only", "By appointment only"], ["both", "Both"]].map(([v, label]) => `<option value="${v}"${ext.walkIns === v ? " selected" : ""}>${label}</option>`).join("")}</select></label>` : ""}
        ${isC || isL || isK ? cb("insured", "Insured", !!r.insured) : ""}
        ${isK ? cb("bonded", "Bonded", !!r.bonded) : ""}
        ${isC || isL || isM ? `<div class="row"><label class="field">License type<input name="licenseLabel" value="${esc(lic.label || "")}" placeholder="${isC ? "AL Plumbing License" : isM ? "AL Massage Therapist License" : "License"}"></label>
          <label class="field">License #<input name="licenseNumber" value="${esc(lic.number || "")}"></label></div>` : ""}
        ${isC ? cb("emergencyService", "Offers emergency service", !!ext.emergencyService) : ""}
        ${isA ? `${cb("ase", isParts ? "ASE-certified parts specialists" : "ASE-certified", !!ext.ase)}
          ${isParts ? "" : `<div class="row"><label class="field">Warranty months<input name="warrantyMonths" type="number" inputmode="numeric" value="${w.months || ""}"></label>
          <label class="field">Warranty miles<input name="warrantyMiles" type="number" inputmode="numeric" value="${w.miles || ""}"></label></div>
          ${cb("warrantyNationwide", "Warranty is nationwide", !!w.nationwide)}`}` : ""}
        ${isK ? `${cb("backgroundChecked", "Team is background-checked", !!ext.backgroundChecked)}${cb("suppliesIncluded", "They bring their own supplies", !!ext.suppliesIncluded)}${cb("petSafe", "Uses pet-safe products", !!ext.petSafe)}` : ""}
        ${isC || (isA && !isParts) || isL || isK ? cb("freeEstimates", isA || isC ? "Free estimates" : "Free quotes", !!ext.freeEstimates) : ""}
        ${isP ? `${cb("designHelp", "They help design artwork", !!ext.designHelp)}${cb("proofBeforePrint", "They send a proof before printing", !!ext.proofBeforePrint)}${r.variant === "signs" ? cb("install", "They install signs", !!ext.install) : ""}` : ""}
        ${isRt ? `${cb("giftCards", "They sell gift cards", !!ext.giftCards)}${cb("delivery", "They deliver", !!ext.delivery)}` : ""}
      </section>
      ${proofEditCard(r)}
      ${visitEditCard(r)}
      ${isR ? restaurantEditCard(r, ext, cb) : ""}
      ${isS ? salonEditCard(r, ext, cb) : ""}
      ${isRt ? retailEditCard(r, ext, cb) : priceListEditCard(r)}
      ${isP ? printEditCard(r, ext) : ""}
      ${isParts ? partsEditCard(r, ext, cb, serviceLines) : ""}
      ${isA && !isParts ? autoEditCard(r, ext, cb) : ""}
      ${isRt ? donationsEditCard(r, ext, cb) : ""}
      ${isF ? financeEditCard(r, ext, cb) : ""}
      ${isCh ? churchEditCard(r, ext, cb) : ""}
      ${isC ? contractorEditCard(r, ext, cb) : ""}
      ${isL ? landscapingEditCard(r, ext, cb) : ""}
      ${isK ? cleaningEditCard(r, ext, cb) : ""}
      ${isC || isL || isK ? plansEditCard(r) + guaranteeEditCard(r, isK) + offersEditCard(r) : ""}
      ${!r.existingSite && r.siteImport ? `<section class="card"><h2>Their current website</h2><p class="small muted">We tried to read <a href="${esc(r.siteImport.url)}" target="_blank" rel="noopener">${esc(r.siteImport.url.replace(/^https?:\/\//, ""))}</a> on ${esc(r.siteImport.triedAt)} UTC and couldn't: ${esc(r.siteImport.error)}. Rewrite tries again; if it keeps failing, add their photos and details by hand.</p></section>` : ""}
      ${r.existingSite ? `<section class="card"><h2>Their current website</h2>
        <p class="small muted">Read from <a href="${esc(r.existingSite.url)}" target="_blank" rel="noopener">${esc(r.existingSite.url.replace(/^https?:\/\//, ""))}</a> on ${esc(r.existingSite.fetchedAt)}. Used as background for the text (rewritten, never copied). Check it's really theirs.</p>
        ${r.existingSite.notices.length ? `<p class="small"><strong>Notice on their site:</strong> ${esc(r.existingSite.notices.join(" / "))}</p>` : ""}
        ${r.existingSite.headings.length ? `<p class="small muted">Headings: ${esc(r.existingSite.headings.slice(0, 8).join(" · "))}</p>` : ""}
        ${r.existingSite.paragraphs.slice(0, 4).map((p) => `<p class="small">${esc(p.length > 240 ? p.slice(0, 240) + "…" : p)}</p>`).join("")}
        <div class="btns"><button class="btn btn--small btn--danger" type="button" data-forgetsite>✖ Not their website: remove this text and its photos</button></div>
      </section>` : ""}
      <section class="card"><h2>Links</h2>
        ${isR ? `<label class="field">Online ordering link<input name="order" type="url" value="${esc(r.links.order || "")}" placeholder="https://"></label>
        <label class="field">Reservations link<input name="reserve" type="url" value="${esc(r.links.reserve || "")}" placeholder="https://"></label>
        <p class="small muted">Ask which register (POS) they use; the ordering page comes from it. Shift4 SkyTab: turn on SkyTab Online in the SkyTab back office and paste its ordering page link (orders go straight into the POS). Toast: the Toast Online Ordering page link. Square: the Square Online site link. Clover: the Clover Online Ordering link. The site links to that page; it never takes orders itself. Reservations: OpenTable, Resy or Tock give a reserve link the same way.</p>` : ""}
        ${isRt ? `<label class="field">${r.variant === "florist" ? "Online flower order page" : "Online shop (Shopify, Etsy, Facebook shop)"}<input name="shop" type="url" value="${esc(ext.shopUrl || "")}" placeholder="https://"></label>` : ""}
        ${isP ? `<label class="field">Email for artwork<input name="email" type="email" value="${esc(r.email || "")}" placeholder="orders@…"></label>` : ""}
        <label class="field">Online booking link<input name="booking" type="url" value="${esc(r.links.booking || "")}" placeholder="https://"></label>
        ${isR || isS || isRt ? `<label class="field">Gift cards link (Square, Toast, their booking tool)<input name="giftCards" type="url" value="${esc(r.links.giftCards || "")}" placeholder="https://"></label>` : ""}
        ${isA && !isParts ? `<p class="small muted">Ask which shop software they use. Tekmetric: Settings → Online Booking gives a public “direct link” (or an embed; use the link). Shopmonkey: the Work Request form has a shareable public URL. ShopGenie: the online scheduling page has its own link. AutoLeap: the online booking page URL. Paste that link here and the site's main button becomes Book online.</p>` : ""}
        <label class="field">Facebook page<input name="facebook" type="url" value="${esc(r.links.social.facebook || "")}" placeholder="https://facebook.com/…"></label>
        <label class="field">Search Console code <span class="hint">Google Search Console → Add property → URL prefix (the live address) → HTML tag: paste only the code between content="…". Goes on the live site, never the preview. Then submit /sitemap.xml.</span><input name="gsc" value="${esc((r.seo && r.seo.googleSiteVerification) || "")}" maxlength="120" placeholder="AbC123…" autocapitalize="off" spellcheck="false"></label>
        <label class="field">Google Analytics ID <span class="hint">Filled in by the app when the site is published (its own Google Analytics property). Only type one if the business already has its own Google Analytics; leave it blank otherwise.</span><input name="gaId" value="${esc((r.seo && r.seo.gaId) || "")}" maxlength="20" placeholder="G-…" autocapitalize="characters" spellcheck="false"></label>
        <label class="field">Instagram<input name="instagram" type="url" value="${esc(r.links.social.instagram || "")}" placeholder="https://instagram.com/…"></label>
      </section>
      <section class="card"><h2>Their domain name</h2>
        <label class="field">Domain name <span class="hint">The domain they bought (or we bought for them, in their name). Type it before or after publishing: publishing (or saving, on a live site) connects it, and the site switches to it by itself once the domain works. Blank = the free .pages.dev address. Then add the DNS record the lead page shows (Client site → Their own domain).</span><input name="customDomain" value="${esc(l.customDomain || "")}" placeholder="www.theirbusiness.com" autocapitalize="off" autocomplete="off" inputmode="url" spellcheck="false"></label>
      </section>
    </div><div>
      <section class="card"><h2>Text</h2>
        <label class="field">Headline line<input name="heroTagline" value="${esc(c.heroTagline)}"></label>
        <label class="field">Short intro<textarea name="heroSub">${esc(c.heroSub)}</textarea></label>
        <label class="field">About (blank line between paragraphs)<textarea name="about" rows="8">${esc(c.about.join("\n\n"))}</textarea></label>
        <label class="field">Closing heading<input name="ctaTitle" value="${esc(c.ctaTitle)}"></label>
        <label class="field">Closing line<input name="ctaLine" value="${esc(c.ctaLine)}"></label>
        <label class="field">Google search description <span class="hint">About 150 characters</span><textarea name="metaDescription" rows="3">${esc(c.meta.description)}</textarea></label>
        ${isC || isL || isK ? `<div class="row"><label class="field">Question headline <span class="hint">Used by the “A question” headline style</span><input name="heroQuestion" maxlength="80" value="${esc(c.heroQuestion || "")}" placeholder="Is your AC blowing warm air?"></label>
        <label class="field">Benefit headline <span class="hint">Used by the “A benefit” headline style</span><input name="heroBenefit" maxlength="80" value="${esc(c.heroBenefit || "")}" placeholder="Take your weekend back"></label></div>` : ""}
        ${hasServices ? r.services.map((s) => `<label class="field">${esc(s.name)}<textarea name="blurb_${esc(s.id)}" rows="3">${esc(c.serviceBlurbs[s.id] || "")}</textarea></label>`).join("") : ""}
      </section>
      ${isR ? `<section class="card"><h2>Menu</h2><p class="small muted">One item per line: <code>Name | $Price | Description</code>. Start a section with <code># Section name</code>.</p>
        <label class="field"><span class="sr-only">Menu</span><textarea name="menuText" rows="12" placeholder="# Plates&#10;Pulled pork plate | $12 | Two sides and bread">${esc(l.menuText)}</textarea></label>
        ${menuItemsEditHtml(id, r)}</section>` : ""}
      ${hasServices && !isParts ? `<section class="card"><h2>${hasTowns ? "Services &amp; area" : "Services"}</h2>
        <label class="field">${isS ? "Services, prices and how long, one per line <span class=\"hint\">e.g. <code>Haircut | $25 | 30 min</code> or <code>Color | from $80 | 90 min</code>. A long menu: start each group with a line like <code># Color</code> (add <code>| a note</code> under it), and <code>+$5</code> for an add-on.</span>" : "Services (one per line)"}<textarea name="services" rows="${isS ? 14 : 7}">${esc(serviceLines)}</textarea></label>
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
      const html = { "card-photo": () => photoCardHtml(fresh.record, id), "card-gallery": () => galleryCardHtml(id, fresh.record), "card-stock": () => stockCardHtml(id, fresh), "card-es": () => esCardHtml(id, fresh.copy) };
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
        if (act === "rekind") {
          const cat = form.elements.category.value;
          if (cat === l.category) return toast("That's already its kind");
          const name = (PACKS.find(([k]) => k === cat) || [])[1] || cat;
          if (!confirm(`Rebuild ${r.name}'s site as "${name}"? The sections and text are redone for the new kind (a few minutes). Photos, links and owner facts stay.`)) return;
          busy("Rebuilding…");
          await api(`/leads/${id}/recategorize`, { method: "POST", json: { category: cat } });
          dirty = false;
          toast("Rebuilding as " + name);
          go(`#/lead/${id}`);
          return;
        }
        if (act === "upload") {
          const file = $app.querySelector("#photo").files[0];
          if (!file) return toast("Choose a photo first");
          busy("Uploading…");
          const { blob, w: pw, h: ph } = await resizeImage(file);
          const alt = $app.querySelector("#photoAlt").value || r.name;
          await api(`/leads/${id}/photo?w=${pw}&h=${ph}&alt=${encodeURIComponent(alt)}`, { method: "POST", body: blob, type: "image/jpeg" });
          toast("Photo saved");
          await refreshCards("card-photo", "card-stock");
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
        } else if (act === "delhero") {
          if (!confirm("Remove the main photo? The site goes back to a stock photo until you upload another.")) return;
          await api(`/leads/${id}/photo`, { method: "DELETE" });
          toast("Main photo removed");
          await refreshCards("card-photo", "card-stock");
        } else if (act === "delphoto") {
          if (!confirm(b.dataset.photo === "google" ? "Remove every Google photo from the gallery?" : "Remove this photo from the site?")) return;
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
        look: val("lookBase") + "~" + val("layout") + dnaCode(f, l.dnaOrder),
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
          warranty: isA && !isParts ? { months: num("warrantyMonths"), miles: num("warrantyMiles"), nationwide: !!on("warrantyNationwide") } : undefined,
          backgroundChecked: on("backgroundChecked"),
          suppliesIncluded: on("suppliesIncluded"),
          petSafe: on("petSafe"),
          links: { order: val("order"), reserve: val("reserve"), booking: val("booking"), facebook: val("facebook"), instagram: val("instagram"), ...(isRt ? { shop: val("shop") } : {}), ...(isR || isS || isRt ? { giftCards: val("giftCards") } : {}) },
          seo: { googleSiteVerification: val("gsc"), gaId: val("gaId") },
          proof: proofEditValues(f),
          ...visitEditValues(f),
          ...(isR ? { restaurant: restaurantEditValues(f), menuItems: menuItemsEditValues(f) } : {}),
          ...(isS ? { salon: salonEditValues(f, r) } : {}),
          ...(isRt ? { retail: retailEditValues(f, r) } : { priceList: priceListEditValues(f) }),
          ...(isP ? { print: printEditValues(f) } : {}),
          hiring: (() => { const roles = (val("hiringRoles") || "").split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 8); return roles.length ? { roles, how: val("hiringHow") || "" } : null; })(),
          events: parseEventLines(val("events") || ""),
          ...(isP ? { email: val("email"), designHelp: on("designHelp"), proofBeforePrint: on("proofBeforePrint"), ...(r.variant === "signs" ? { install: on("install") } : {}) } : {}),
          ...(isRt ? { giftCards: on("giftCards"), delivery: on("delivery"), donations: donationsEditValues(f) } : {}),
          ...(isA && val("autoKind") && val("autoKind") !== r.variant ? { autoKind: val("autoKind") } : {}),
          ...(isParts ? { parts: partsEditValues(f) } : {}),
          ...(isA && !isParts ? { auto: autoEditValues(f, r) } : {}),
          ...(isF ? { finance: financeEditValues(f, r) } : {}),
          ...(isCh ? { church: churchEditValues(f) } : {}),
          ...(isC ? { contractor: contractorEditValues(f) } : {}),
          ...(isL ? { landscaping: landscapingEditValues(f) } : {}),
          ...(isK ? { cleaning: cleaningEditValues(f, r) } : {}),
          ...(isC || isL || isK ? { plans: plansEditValues(f), guarantee: guaranteeEditValues(f), offers: parseOfferLines(val("offers") || "") } : {}),
          galleryMeta: galleryMetaValues(f, r),
          testimonials,
          towns: hasTowns ? val("towns").split(",").map((s) => s.trim()).filter(Boolean) : undefined,
          services: hasServices ? val("services").split("\n").map((s) => s.trim()).filter(Boolean) : undefined,
          address: val("addrCity") ? { street: val("addrStreet"), city: val("addrCity"), zip: val("addrZip") } : undefined,
          heroFocus: f.elements.heroFocus ? f.elements.heroFocus.value : undefined,
          heroZoom: f.elements.heroZoom ? (f.elements.heroZoom.value ? Number(f.elements.heroZoom.value) : null) : undefined,
          hiddenScenes: f.querySelector('[name^="noscene_"]') ? [...f.querySelectorAll('[name^="noscene_"]')].filter((x) => x.checked).map((x) => x.name.slice(8) + ".jpg") : undefined,
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
          heroQuestion: val("heroQuestion"),
          heroBenefit: val("heroBenefit"),
        },
      };
      const btn = f.querySelector("button[type=submit]");
      btn.disabled = true;
      try {
        await api(`/leads/${id}/edits`, { method: "PUT", json: edits });
        // Their domain name: only when it changed (remembered before publishing, connected + republished after).
        const typedDomain = (val("customDomain") || "").toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
        if (typedDomain !== (l.customDomain || "")) {
          if (typedDomain) await api(`/leads/${id}/domain`, { method: "PUT", json: { domain: typedDomain } });
          else await api(`/leads/${id}/domain`, { method: "DELETE" });
        }
        dirty = false;
        try { sessionStorage.removeItem(draftKey(id)); } catch (e) { /* storage blocked */ }
        toast("Saved. Preview updated.");
        go("#/lead/" + id);
      } catch (err) { toast(err.message); } finally { btn.disabled = false; }
    });
    tagEditCards(jumpTo);
  }

  /* ---------- call guide ---------- */
  async function shareLink(id, lang) {
    const { url } = await api(`/leads/${id}/share`, { method: "POST", json: lang ? { lang } : undefined });
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
  // Flyer code: the 5 digits to hand-write in the box on a mailed or left-behind flyer (undergroundassociates.com/code).
  function mailCodeHtml(l) {
    if (!l.mailCode) return `<button class="btn" type="button" data-mailcode="${esc(l.id)}">📬 Get flyer code</button>
      <p class="small muted">For the mail-out / leave-behind flyer: write the code in the white box. They type it at undergroundassociates.com/code to see this preview, and you get an alert.</p>`;
    return `<p style="margin:0">📬 Flyer code: <strong style="font:800 1.6rem/1 ui-monospace,Menlo,monospace;letter-spacing:.15em">${esc(l.mailCode)}</strong></p>
      <p class="small muted" style="margin:4px 0 0">Write it in the white box on their flyer; they enter it at undergroundassociates.com/code and you get an alert. Log "Left a flyer" so their preview stays up 90 days.${l.mailOpens ? ` Used ${l.mailOpens === 1 ? "once" : `${l.mailOpens} times`}, last ${ago(l.mailOpenedAt)}.` : " Not used yet."}</p>`;
  }

  function shareButtonsHtml(l) {
    const es = l && l.hasSpanish ? `<div class="btns btns--full"><button class="btn" type="button" data-share-es-sms>🇲🇽 Text Spanish link</button><button class="btn" type="button" data-share-es-copy>🔗 Copy Spanish message</button><button class="btn" type="button" data-share-es-open>Open Spanish version</button></div>` : "";
    return `<div class="btns btns--full" data-share><button class="btn" type="button" data-share-sms>💬 Text preview link</button><button class="btn" type="button" data-share-copy>🔗 Copy message + link</button></div>${es}
      <p class="small muted">Only text the link after they say it's OK. It works for 14 days, no login needed.${es ? " The Spanish link opens their site in Spanish." : ""}</p>
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
    // Spanish: the link opens /es/ and the text itself is in Spanish.
    const smsBodyEs = (url) => `¡Hola! Aquí está la vista previa gratis del sitio web que hice para ${name}: ${url}`;
    const esBtn = (sel, fn) => $app.querySelectorAll(sel).forEach((b) => b.addEventListener("click", async () => {
      b.disabled = true;
      try { await fn(await shareLink(l.id, "es")); } catch (err) { toast(err.message); } finally { b.disabled = false; }
    }));
    esBtn("[data-share-es-sms]", (url) => { logSent("Text Spanish link"); location.href = `sms:+1${digits}?body=${encodeURIComponent(smsBodyEs(url))}`; });
    esBtn("[data-share-es-copy]", async (url) => {
      logSent("Copy Spanish message");
      const msg = smsBodyEs(url);
      try { await navigator.clipboard.writeText(msg); toast("Spanish message with the link copied."); }
      catch (e) { prompt("Copy this message:", msg); }
    });
    esBtn("[data-share-es-open]", (url) => { window.open(url, "_blank", "noopener"); });
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
      ${shareButtonsHtml(l)}
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
  /** One line every plan card and sign-up card carries: where the setup fee applies (month to month adds it by itself). */
  const feeNote = (t) => t.commits.length ? `No setup fee on ${commitWords(t)} plans${t.flex ? `; month to month adds a one-time ${money(t.flex)} setup fee, applied automatically in the sign-up` : ""}.` : "One monthly price, no setup fee.";
  function payWays(s, plans, church) {
    const t = payTerms(s, church);
    const out = t.commits.map((m) => [`${m}-month plan`, `The monthly price, no setup fee. After ${m} months, cancel any time with 30 days' notice.`]);
    if (!t.commits.length) out.push(["Monthly", "The monthly price. Cancel any time."]);
    if (t.flex) out.push(["Month to month", `Same monthly price plus a one-time ${money(t.flex)} setup fee. No contract, cancel any time.`]);
    if (s.invoiceForAll !== false || church) out.push(["Pay by invoice", "We send an invoice; pay by check or bank transfer. Monthly invoices are due in 15 days, yearly in 30. Nothing is charged online."]);
    if (t.free) out.push([`Pay yearly, ${t.free} months free`, `12 months for the price of ${12 - t.free}${t.church ? " for churches and nonprofits" : ""}, no setup fee. ${plans.map((p) => `${esc(p.name)} ${money(p.monthly * (12 - t.free))}/year`).join(" · ")}`]);
    return out;
  }

  /* ---------- plans to show the customer ---------- */
  // Customer-facing words for each tier; prices and "what's included" come live from Settings.
  const PLAN_TAGLINE = {
    basic: "Get found on Google and get the phone ringing.",
    plus: "Your website, plus getting found on Google Maps.",
    pro: "Everything handled for you, every month.",
    list: "Just the prices: a live price page, QR tags, a tablet and your board. Not a website.",
  };
  const EVERY_PLAN = ["We build it for you", "Fast, secure hosting", "Changes when you text us", "Made for phones", "A live price list with QR tags and a tablet display, if your stock changes", "Your name, photos and words stay yours"];

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
          <p class="show__day">${p.setup ? `${money(p.setup)} setup · billed monthly` : t.commits.length ? `No setup fee on ${commitWords(t)} plans${t.flex && p.id !== "list" ? ` · month to month: ${money(t.flex)} setup fee` : ""}` : "Billed monthly"}</p>
          <ul>${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
          ${leadId ? `<button class="show__choose" data-choose="${esc(p.id)}">Choose ${esc(p.name)}</button>` : ""}
          <p class="show__agree"><a href="/api/contract?${leadId ? `lead=${encodeURIComponent(leadId)}&` : ""}plan=${encodeURIComponent(p.id)}" target="_blank" rel="noopener">Read the agreement</a></p>
        </section>`;
      }).join("")}</div>
      <section class="show__box"><h2>Every plan includes</h2><ul class="show__every">${EVERY_PLAN.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></section>
      <section class="show__box"><h2>Ways to pay</h2><div class="show__ways">
        ${payWays(s, plans, church).map(([h, d]) => `<div><h3>${esc(h)}</h3><p>${d}</p></div>`).join("")}
      </div></section>
      ${[["general", "Extras"], ["inventory", "Inventory add-ons"]].map(([g, h]) => { const list = (s.addons || []).filter((a) => addonGroup(a) === g); return list.length ? `<section class="show__box"><h2>${h}</h2>${g === "inventory" ? `<p class="show__fine" style="margin-top:0">For the live price list: with the ${esc((plans.find((p) => p.id === "list") || { name: "Price list" }).name)} plan or any website plan.</p>` : ""}<ul class="show__addons">${list.map((a) => `<li><span>${esc(a.name)}${a.about ? `<small>${esc(a.about)}</small>` : ""}</span><strong>${esc(addonPrice(a))}</strong></li>`).join("")}</ul></section>` : ""; }).join("")}
      <p class="show__fine">You see your website before you pay anything, and nothing goes live until you say so. Cancel with 30 days' notice${t.commits.length ? ` once your ${commitWords(t)} plan's months are up` : ""}.</p>
    </div>`;
    $app.querySelectorAll("[data-choose]").forEach((b) => b.addEventListener("click", async () => {
      b.disabled = true;
      b.textContent = "Opening sign-up…";
      try {
        const res = await api(`/leads/${leadId}/signup`, { method: "POST", json: { plan: b.dataset.choose } });
        location.href = tapHref(res.url);
      } catch (err) { toast(err.message); b.disabled = false; b.textContent = "Try again"; }
    }));
  }

  /** 📋 Show them the board: a customer-facing page for a shop (owner and callers), from /api/leads/:id/showboard. */
  async function viewShowBoard(leadId) {
    stopPolling();
    const my = renderSeq;
    let p;
    try { p = await api(`/leads/${leadId}/showboard`); } catch (err) { if (stale(my)) return; $app.innerHTML = `<section class="card"><p class="bad">${esc(err.message)}</p></section>`; return; }
    if (stale(my)) return;
    const company = meta.settings.companyName || "Underground Associates";
    $nav.hidden = true;
    document.body.classList.add("showing");
    $app.innerHTML = `<div class="show">
      <div class="show__top"><a href="#/lead/${leadId}" class="show__back">← Back</a><span class="show__co">${esc(company)}</span></div>
      <header class="show__head"><h1>${esc(p.title)}</h1><p>${esc(p.lead)}</p></header>
      <div class="show__plans">${p.sections.map((s) => `<section class="show__plan"><h2>${esc(s.title)}</h2>
        <${s.numbered ? "ol class=\"show__steps\"" : "ul"}>${s.steps.map((x) => `<li>${esc(x)}</li>`).join("")}</${s.numbered ? "ol" : "ul"}></section>`).join("")}</div>
      <section class="show__box"><h2>What it costs</h2><ul class="show__every">${p.price.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></section>
      <section class="show__box"><h2>See it</h2>
        <div class="btns btns--full"><button class="show__choose" type="button" data-tryboard>🐠 Try the board on this phone</button><button class="btn" type="button" data-textpitch>💬 Text them this page</button><a class="btn" href="${esc(p.displayUrl)}" target="_blank" rel="noopener">📺 See the tablet view</a><a class="btn" href="#/plans/${leadId}">📋 See the plans</a></div></section>
      <p class="show__fine">${esc(p.fine)}</p>
    </div>`;
    const tp = $app.querySelector("[data-textpitch]");
    tp.addEventListener("click", async () => {
      tp.disabled = true;
      try { const { text } = await api(`/leads/${leadId}/boardlink`, { method: "POST" }); const d = ((p.phone || "").match(/\d/g) || []).join("").replace(/^1/, ""); location.href = `sms:${d ? "+1" + d : ""}?body=${encodeURIComponent(text)}`; }
      catch (err) { toast(err.message); } finally { tp.disabled = false; }
    });
    const tb = $app.querySelector("[data-tryboard]");
    tb.addEventListener("click", async () => {
      tb.disabled = true;
      try { const { url } = await api(`/leads/${leadId}/clientlink`, { method: "POST" }); window.open(url, "_blank", "noopener"); }
      catch (err) { toast(err.message); } finally { tb.disabled = false; }
    });
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
    list: {
      fit: "Any business whose stock or prices change often (fish, plants, produce, bakeries, resale, feed, auto parts, used cars) that isn't ready for a whole website.",
      points: [
        "They change what's in each tank, bin or row from their phone in seconds. No login, no computer. Sold out hides it; the count shows how many are left.",
        "QR tags on every section open its live prices; a cheap tablet by the tank or counter shows them with no QR at all, and with the Barcode scanning add-on counts stock in and out by barcode.",
      "A long list goes on in one go: paste it from a spreadsheet or the register's export and it's sorted into sections. No retyping.",
        "No minimum and no setup fee, so there's nothing to think about. Cancel any time.",
        "Every dollar of the month they're on it counts toward a full website when they're ready; the price page just becomes part of it.",
      ],
      line: "Try the price list for a month. If it saves you one argument about a price, it's paid for itself.",
    },
  };

  const PLAN_QUESTIONS = [
    ["Tight budget, or only wants the basics?", "Basic"],
    ["Most of their customers find them on Google or Maps?", "Plus"],
    ["Wants proof it's working?", "Plus (monthly report)"],
    ["Wants everything done for them, or has lots of competition?", "Pro"],
    ["Wants a business email (info@theirbusiness.com)?", "Pro (free email forwarding, or a Google mailbox Google bills them for)"],
    ["Wants their own .com?", "Any plan: they buy it, or we buy it in their name and add it to the bill (free on Pro)"],
  ];

  // Common things owners say on the call, and an honest answer to each.
  function playbookObjections(s, plans) {
    const cheapest = plans.reduce((a, p) => (p.id !== "list" && p.monthly && (!a || p.monthly < a.monthly) ? p : a), null);
    const low = cheapest ? `${esc(cheapest.name)} is ${money(cheapest.monthly)} a month` : "Our starter plan is low monthly";
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
      ["“Do I need to buy a domain name?” / “What's a domain?”",
        "A domain is your web address, like smithplumbing.com. You've got three choices. Use the free address that comes with every plan (like smithplumbing.pages.dev). Buy your own at Cloudflare, GoDaddy or Namecheap, about $10 to $15 a year, and we hook it up. Or we buy it for you and add a small charge to your monthly bill; it's included with Pro. Whichever you pick, it's in your name and it belongs to you."],
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
      ["“Do you have a referral program?”",
        `Yes. When a business you refer signs up for a ${s.referralMinMonths ?? 6}- or 12-month plan and their first payment goes through, you get ${s.referralMonths ?? 2} months of your plan free, up to ${s.referralMaxPerYear ?? 2} referrals a year; more than that carry over to the next year. Just have them mention your business name when they sign up.`],
    ];
  }

  /** 📖 Guides: a how-to from /api/guides/<id> (one source with the Android app). Settings → Guides. */
  async function viewGuide(id) {
    setNav("home");
    const my = renderSeq;
    $app.innerHTML = `<section class="card"><h2>📖 Guide</h2><p class="muted">Loading…</p></section>`;
    let g;
    try { g = await api(`/guides/${id}`); } catch (err) { if (stale(my)) return; $app.innerHTML = `<section class="card"><p class="bad">${esc(err.message || NO_CONNECTION)}</p></section>`; return; }
    if (stale(my)) return;
    $app.innerHTML = `<section class="card"><h2>${esc(g.title)}</h2><p class="muted">${esc(g.intro)}</p>
      <p class="small muted">Tap a section to open it. <a href="#/settings">Back to Settings</a></p></section>
      ${g.sections.map((s, i) => `<details class="card"${i === 0 ? " open" : ""}><summary style="cursor:pointer"><strong>${esc(s.title)}</strong></summary>
        <${s.numbered ? "ol" : "ul"}>${s.steps.map((x) => `<li style="margin-bottom:6px">${esc(x)}</li>`).join("")}</${s.numbered ? "ol" : "ul"}>
        ${s.note ? `<p class="small muted"><strong>Good to know:</strong> ${esc(s.note)}</p>` : ""}</details>`).join("")}`;
  }

  /** 💵 Costs & usage (owner and full access): every paid service, this month's usage and estimate, renewals, warnings; edits save to /api/costs. */
  async function viewCosts() {
    setNav("home");
    const my = renderSeq;
    $app.innerHTML = `<section class="card"><h2>💵 Costs & usage</h2><p class="muted">Loading…</p></section>`;
    let r;
    try { r = await api("/costs"); } catch (err) { if (stale(my)) return; $app.innerHTML = `<section class="card"><p class="bad">${esc(err.message || NO_CONNECTION)}</p></section>`; return; }
    if (stale(my)) return;
    const cents = (c) => money(Math.round(c) / 100);
    const monthName = (ym) => new Date(`${ym}-15T12:00:00Z`).toLocaleDateString([], { month: "long", year: "numeric", timeZone: "UTC" });
    const qty = (n) => Number(n || 0).toLocaleString("en-US");
    const kindLabel = { fixed: "Fixed price", usage: "Billed by use", fees: "Fees per payment", free: "Free" };
    const rateText = (l) => l.unit === "per_million" ? `${cents(l.unitCents)} per million tokens` : l.unitCents ? `${l.unitCents >= 100 ? cents(l.unitCents) : `${Number(l.unitCents.toFixed(2))}¢`} each` : "free";
    const render = () => {
      const t = r.totals;
      const net = t.revenueCents - t.outCents;
      $app.innerHTML = `<section class="card"><h2>💵 Costs & usage</h2>
        <p class="muted small">${monthName(r.month)} so far. Estimates from the app's own counter and the prices below; the invoices are on each service's billing page. <a href="#/guide/costs">How to read this</a> · <a href="#/settings">Settings</a></p>
        <div class="split">
          <div><p><strong>Going out:</strong> ${cents(t.outCents)} this month<br><span class="small muted">${cents(t.fixedCents)} fixed · ${cents(t.usageCents)} usage · ${cents(t.feesCents)} card fees</span></p></div>
          <div><p><strong>Coming in:</strong> ${cents(t.revenueCents)} a month from paid plans${t.signedRevenueCents > t.revenueCents ? `<br><span class="small muted">${cents(t.signedRevenueCents)} once everyone signed has paid</span>` : ""}</p></div>
        </div>
        <p><strong>${net >= 0 ? "Ahead" : "Behind"} by ${cents(Math.abs(net))} a month</strong> · budget ${cents(r.budgetCents)} <button class="btn btn--small" id="budgetEdit" type="button">Change budget</button></p>
        ${r.warnings.length ? `<div style="margin-top:8px;padding:8px 10px;border-radius:8px;background:rgba(252,163,17,.15)">${r.warnings.map((w) => `<p style="margin:4px 0">⚠️ ${esc(w)}</p>`).join("")}</div>` : `<p class="small muted">No warnings this month.</p>`}
      </section>
      ${r.services.map((s) => `<section class="card" data-svc="${esc(s.id)}">
        <h2>${s.emoji} ${esc(s.name)}</h2>
        <p class="small muted">${kindLabel[s.kind]}${s.kind === "fixed" ? ` · ${s.monthlyCents === null ? "price not set" : `${cents(s.monthlyCents)} a ${s.renewEvery === "year" ? "year" : "month"}`}${s.renews ? ` · renews ${esc(s.renews)}` : ""}` : ""}${s.perMonthCents && s.kind !== "fixed" ? ` · about ${cents(s.perMonthCents)} this month` : ""}</p>
        <p>${esc(s.what)}</p>
        ${s.usage.length ? `<table class="stats"><thead><tr><th>What</th><th>This month</th><th>Last month</th><th>Rate</th><th>Est.</th></tr></thead><tbody>${s.usage.map((l) => `<tr><td style="text-align:left">${esc(l.label)}${l.freeQty > 0 && l.freeQty < 1000000 ? `<br><span class="muted">${qty(l.freeQty)} free a month${l.freeUsed !== null ? ` · ${Math.round(l.freeUsed * 100)}% used` : ""}</span>` : ""}${l.note ? `<br><span class="muted">${esc(l.note)}</span>` : ""}</td><td>${qty(l.month)}</td><td>${qty(l.lastMonth)}</td><td>${esc(rateText(l))}</td><td>${l.estCents ? cents(l.estCents) : "—"}</td></tr>`).join("")}</tbody></table>` : ""}
        ${s.warnings.map((w) => `<p class="small" style="margin:4px 0">⚠️ ${esc(w)}</p>`).join("")}
        <p class="small"><strong>If it stops:</strong> ${esc(s.ifItStops)}</p>
        ${s.tip ? `<p class="small muted">${esc(s.tip)}</p>` : ""}
        ${s.account ? `<p class="small"><strong>Account:</strong> ${esc(s.account)}</p>` : ""}
        ${s.notes ? `<p class="small"><strong>Notes:</strong> ${esc(s.notes).replace(/\n/g, "<br>")}</p>` : ""}
        <div class="btns">${s.url ? `<a class="btn btn--small" href="${esc(s.url)}" target="_blank" rel="noopener">Open ${s.kind === "free" ? "dashboard" : "billing"}</a>` : ""}<button class="btn btn--small" type="button" data-edit="${esc(s.id)}">Edit</button></div>
        <form class="costedit" data-form="${esc(s.id)}" hidden style="margin-top:10px">
          ${s.kind === "fixed" ? `<label class="field">Price (dollars per ${s.renewEvery === "year" ? "year" : "month"})<input name="monthly" type="number" step="0.01" min="0" value="${s.monthlyCents === null ? "" : (s.monthlyCents / 100).toFixed(2)}"></label>
          <label class="field">Next renewal date<input name="renews" type="date" value="${esc(s.renews || "")}"></label>` : ""}
          <label class="field">Account it's under (login email, who owns it)<input name="account" value="${esc(s.account || "")}" placeholder="e.g. the owner's Google address"></label>
          <label class="field">Notes<textarea name="notes" rows="2" placeholder="Card on file, extra mailboxes, who to call…">${esc(s.notes || "")}</textarea></label>
          ${s.usage.length ? `<p class="small muted" style="margin:8px 0 4px">Rates (the estimate uses these; check them against the bill once)</p>${s.usage.map((l) => `<div class="row"><label class="field" style="flex:2">${esc(l.label)}: ${l.unit === "per_million" ? "dollars per million tokens" : "cents each"}<input name="rate:${esc(l.metric)}" type="number" step="0.001" min="0" value="${l.unit === "per_million" ? (l.unitCents / 100).toFixed(2) : Number(l.unitCents.toFixed(3))}"></label><label class="field" style="flex:1">Free a month<input name="free:${esc(l.metric)}" type="number" step="1" min="0" value="${l.freeQty}"></label></div>`).join("")}` : ""}
          <div class="btns" style="margin-top:8px"><button class="btn btn--primary btn--small" type="submit">Save</button><button class="btn btn--small" type="button" data-cancel="${esc(s.id)}">Cancel</button></div>
        </form>
      </section>`).join("")}`;
      $app.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => { const f = $app.querySelector(`[data-form="${b.dataset.edit}"]`); f.hidden = !f.hidden; if (!f.hidden) f.querySelector("input,textarea").focus(); }));
      $app.querySelectorAll("[data-cancel]").forEach((b) => (b.onclick = () => ($app.querySelector(`[data-form="${b.dataset.cancel}"]`).hidden = true)));
      $app.querySelectorAll("form.costedit").forEach((f) => (f.onsubmit = async (e) => {
        e.preventDefault();
        const id = f.dataset.form;
        const svc = r.services.find((x) => x.id === id);
        const fd = new FormData(f);
        const body = { services: { [id]: { account: String(fd.get("account") || "").trim() || null, notes: String(fd.get("notes") || "").trim() || null } }, rates: {} };
        if (svc.kind === "fixed") {
          const m = String(fd.get("monthly") || "").trim();
          body.services[id].monthlyCents = m === "" ? null : Math.round(Number(m) * 100);
          body.services[id].renews = String(fd.get("renews") || "") || null;
        }
        for (const l of svc.usage) {
          const rate = Number(fd.get(`rate:${l.metric}`));
          const free = Number(fd.get(`free:${l.metric}`));
          body.rates[l.metric] = { unitCents: l.unit === "per_million" ? Math.round(rate * 100 * 1000) / 1000 : rate, freeQty: Math.max(0, Math.round(free)) };
        }
        try { r = await api("/costs", { method: "PUT", json: body }); toast("Saved"); render(); } catch (err) { toast(err.message || NO_CONNECTION); }
      }));
      $app.querySelector("#budgetEdit").onclick = async () => {
        const v = prompt("Monthly budget in dollars (the screen warns above it; 0 turns the warning off)", (r.budgetCents / 100).toFixed(0));
        if (v === null || v.trim() === "" || Number.isNaN(Number(v))) return;
        try { r = await api("/costs", { method: "PUT", json: { budgetCents: Math.max(0, Math.round(Number(v) * 100)) } }); toast("Saved"); render(); } catch (err) { toast(err.message || NO_CONNECTION); }
      };
    };
    render();
  }

  /** 🎓 Training: the course from /api/training (one source with the Android app), progress saved per person. */
  /* ---------- commission calculator ---------- */
  // Exactly what a sale pays each person: plan + way to pay + extras, split or not, owner or not. The server prices the
  // order with the same code that charges the client (POST /api/commission/quote); the rules live in Settings → Commission.
  async function viewCommission() {
    setNav("home");
    const my = renderSeq;
    $app.innerHTML = `<section class="card"><h2>💰 Commission calculator</h2><p class="muted">Loading…</p></section>`;
    let d;
    try { d = await api("/commission"); } catch (err) { if (stale(my)) return; $app.innerHTML = `<section class="card"><p class="bad">${esc(err.message || NO_CONNECTION)}</p></section>`; return; }
    if (stale(my)) return;
    const c = (cents) => (cents < 0 ? "no end" : "$" + (cents / 100).toFixed(2));
    const R = d.rules;
    const first = d.plans[0];
    const st = { plan: first.id, billing: (first.options.find((o) => o.id === "standard") || first.options[0]).id, picks: {}, founder: "", church: false, quote: "", who: "solo", owner: "none" };
    const planOf = () => d.plans.find((p) => p.id === st.plan) || first;
    const founders = d.addons.filter((a) => a.founderPick && a.unit !== "month" && a.unit !== "quote");
    const unitWord = { month: "a month", each: "each", "one-time": "once", quote: "priced per job" };
    const extraRow = (a) => `<label class="check" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><input type="checkbox" data-pick="${a.index}"> <span style="flex:1 1 180px">${esc(a.name)} <span class="muted small">· ${esc(a.priceText)}</span></span>${a.unit === "each" ? `<input type="number" min="1" max="20" value="1" data-qty="${a.index}" style="width:64px" aria-label="How many">` : ""}</label>`;
    $app.innerHTML = `<section class="card"><h2>💰 Commission calculator</h2>
      <p class="small muted">Pick what the client is buying. It shows what each person gets, using the same prices the client is charged. The rules are set by the owner in Settings → Commission.</p>
      <form id="cf" class="settings-form" onsubmit="return false">
        <div class="row"><label class="field">Plan<select name="plan">${d.plans.map((p) => `<option value="${esc(p.id)}">${esc(p.name)} · $${p.monthly}/month</option>`).join("")}</select></label>
        <label class="field">Way to pay<select name="billing"></select></label></div>
        <label class="check" id="cf-church" hidden><input type="checkbox" name="church"> Church or nonprofit (ministry yearly rate)</label>
        <h3 style="margin:14px 0 6px">Extras</h3>
        <div>${d.addons.filter((a) => a.unit !== "quote" || true).map(extraRow).join("")}</div>
        <label class="field" id="cf-quote" hidden>What we're charging for the priced-per-job extras ($)<input name="quote" type="number" min="0" step="1" inputmode="decimal" placeholder="e.g. 250"></label>
        ${founders.length ? `<label class="field">Founding customer's free extra <span class="hint">Free extras earn nothing</span><select name="founder"><option value="">None</option>${founders.map((a) => `<option value="${a.index}">${esc(a.name)}</option>`).join("")}</select></label>` : ""}
        <h3 style="margin:14px 0 6px">Who made the sale</h3>
        <label class="check"><input type="radio" name="who" value="solo" checked> One person did it all</label>
        <label class="check"><input type="radio" name="who" value="split"> One person opened it, someone else closed it</label>
        <label class="field">The owner in this sale<select name="owner"><option value="none">Not part of it</option><option value="seller">Made the whole sale</option><option value="opener">Opened it</option><option value="closer">Closed it</option></select></label>
      </form></section>
      <div id="cq"></div>
      <section class="card"><h2>Every plan, no extras</h2>
        <p class="small muted">Up front = when the first payment clears. Each payment after = every later monthly payment, or each yearly renewal. ${R.residualCapMonths ? `Until it stops = everything over the first ${R.residualCapMonths} months.` : "Payments keep earning for as long as the client pays."}</p>
        <div style="overflow-x:auto"><table class="stats"><thead><tr><th>Plan</th><th>Way to pay</th><th>Client pays first</th><th>Up front</th><th>Each payment after</th><th>First year</th><th>Until it stops</th></tr></thead><tbody>
        ${d.table.plans.map((r) => `<tr><th scope="row">${esc(r.plan)}</th><td style="text-align:left">${esc(r.billingLabel)}</td><td>${c(r.clientFirst)}</td><td><strong>${c(r.bonus)}</strong></td><td>${c(r.residualEach)}${r.interval === "year" ? "/yr" : "/mo"}</td><td>${c(r.yearOne)}</td><td>${c(r.overCap)}</td></tr>`).join("")}
        </tbody></table></div></section>
      <section class="card"><h2>Every extra</h2>
        <p class="small muted">Extras add to the plan's commission. Pick any mix above to see the exact total.</p>
        <div style="overflow-x:auto"><table class="stats"><thead><tr><th>Extra</th><th>Price</th><th>Up front</th><th>Each month after</th><th>How</th></tr></thead><tbody>
        ${d.table.extras.map((e) => `<tr><th scope="row">${esc(e.name)}</th><td>${esc(e.price)}</td><td><strong>${e.unit === "quote" ? `${R.quotePct}%` : c(e.bonus)}</strong></td><td>${e.unit === "month" ? c(e.residualEach) : "—"}</td><td style="text-align:left" class="small">${esc(e.how)}</td></tr>`).join("")}
        </tbody></table></div></section>
      <section class="card"><h2>The rules</h2><ul class="list small">
        <li><strong>Plans and monthly extras:</strong> ${R.bonusMonths === 1 ? "one month" : `${R.bonusMonths} months`} of the price up front, then ${R.residualPct}% of every later payment${R.residualCapMonths ? ` for ${R.residualCapMonths} months from the first payment` : ""}.</li>
        <li><strong>Paid yearly:</strong> one month's price plus ${R.residualPct}% of the yearly payment up front, then ${R.residualPct}% of each renewal.</li>
        <li><strong>Month-to-month setup fee:</strong> ${R.setupPct}% of it, up front.</li>
        <li><strong>One-time and per-item extras:</strong> ${R.oneTimePct}% of what they cost, up front. <strong>Priced per job:</strong> ${R.quotePct}% of what we charge, when it's paid. <strong>Free founder extras:</strong> nothing.</li>
        <li><strong>Split sales:</strong> the opener gets ${R.openerPct}% of the up-front money, the closer the rest and every later payment. A lead stays the opener's for ${R.openerDays} days after their last logged contact.</li>
        <li><strong>Clawback:</strong> if the client cancels or is refunded within ${R.clawbackDays} days, the up-front money comes back out of the next payout.</li>
        <li><strong>The owner:</strong> ${R.ownerEarns ? "earns commission on their own sales like anyone else." : "takes no commission; the owner's share of a sale stays in the company."}</li>
      </ul></section>`;
    const f = document.getElementById("cf");
    const fillBilling = () => {
      const p = planOf();
      if (!p.options.some((o) => o.id === st.billing)) st.billing = (p.options.find((o) => o.id === "standard") || p.options[0]).id;
      f.billing.innerHTML = p.options.map((o) => `<option value="${esc(o.id)}"${o.id === st.billing ? " selected" : ""}>${esc(o.label)}</option>`).join("");
      document.getElementById("cf-church").hidden = !(st.billing === "annual" && d.churchYearly);
    };
    fillBilling();
    let seq = 0;
    let timer = null;
    const run = async () => {
      const mine = ++seq;
      const picks = Object.entries(st.picks).map(([index, qty]) => ({ index: Number(index), qty }));
      const hasQuote = picks.some((p) => (d.addons[p.index] || {}).unit === "quote");
      document.getElementById("cf-quote").hidden = !hasQuote;
      try {
        const q = await api("/commission/quote", { method: "POST", json: { plan: st.plan, billing: st.billing, picks, founder: st.founder === "" ? null : Number(st.founder), church: st.church, quoteDollars: hasQuote && st.quote ? Number(st.quote) : undefined, who: st.who, owner: st.owner } });
        if (mine !== seq || !document.getElementById("cq")) return;
        document.getElementById("cq").innerHTML = quoteHtml(q);
      } catch (err) { if (mine === seq && document.getElementById("cq")) document.getElementById("cq").innerHTML = `<section class="card"><p class="bad">${esc(err.message)}</p></section>`; }
    };
    const later = () => { clearTimeout(timer); timer = setTimeout(run, 150); };
    const quoteHtml = (q) => {
      const per = q.interval === "year" ? "each yearly renewal" : "each month after";
      const who = (p) => `${p.role === "Seller" ? "The seller" : `The ${p.role.toLowerCase()}`}${p.owner ? " (the owner)" : ""}`;
      return `<section class="card card--client"><h2>What this sale pays</h2>
        <p class="small muted">${esc(q.plan)} · ${esc(q.billingLabel)}. The client pays ${c(q.clientFirst)} first${q.clientEach ? `, then ${c(q.clientEach)} ${q.interval === "year" ? "a year" : "a month"}` : ""}.</p>
        ${q.payouts.map((p) => `<div style="margin:12px 0;padding:12px;border:1px solid var(--line);border-radius:10px">
          <p style="margin:0 0 4px"><strong>${esc(who(p))}</strong>${p.keptByCompany ? ` <span class="chip">stays in the company</span>` : ""}</p>
          <p class="bignum" style="font-size:1.6rem">${c(p.first)} <span class="small muted">up front</span></p>
          <p style="margin:4px 0 0">${p.each ? `+ ${c(p.each)} ${per}` : "Nothing after the first payment"} · <strong>${c(p.yearOne)}</strong> in the first year${p.overCap >= 0 && p.overCap !== p.yearOne ? ` · ${c(p.overCap)} until it stops` : ""}</p></div>`).join("")}
        <div style="overflow-x:auto"><table class="stats"><thead><tr><th>What</th><th>Client pays</th><th>Up front</th><th>${q.interval === "year" ? "Each renewal" : "Each month after"}</th></tr></thead><tbody>
          ${q.items.map((i) => `<tr><th scope="row">${esc(i.what)}<br><span class="small muted" style="font-weight:400">${esc(i.how)}</span></th><td>${esc(i.price)}</td><td>${c(i.bonus)}</td><td>${i.residual ? c(i.residual) : "—"}</td></tr>`).join("")}
          <tr><th scope="row">Total</th><td></td><td><strong>${c(q.bonus)}</strong></td><td><strong>${q.residualEach ? c(q.residualEach) : "—"}</strong></td></tr>
        </tbody></table></div>
        <ul class="list small">${q.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>
        ${isOwner() ? `<details class="more"><summary>The company's side, first year</summary><ul class="list small"><li>Client pays ${c(q.clientYearOne)}</li><li>Stripe fees about ${c(q.company.stripeYearOne)}</li><li>Commission paid out ${c(q.company.paidOutYearOne)}</li><li>Team pool ${c(q.company.teamPoolYearOne)}</li><li><strong>Left for the company ${c(q.company.leftYearOne)}</strong>, before running costs</li></ul></details>` : ""}
      </section>`;
    };
    f.addEventListener("input", (e) => {
      const t = e.target;
      if (t.name === "plan") { st.plan = t.value; fillBilling(); }
      else if (t.name === "billing") { st.billing = t.value; fillBilling(); }
      else if (t.name === "church") st.church = t.checked;
      else if (t.name === "quote") st.quote = t.value;
      else if (t.name === "founder") st.founder = t.value;
      else if (t.name === "who") st.who = t.value;
      else if (t.name === "owner") st.owner = t.value;
      else if (t.dataset.pick) { const i = t.dataset.pick; if (t.checked) { const q = f.querySelector(`[data-qty="${i}"]`); st.picks[i] = q ? Math.max(1, Math.min(20, Number(q.value) || 1)) : 1; } else delete st.picks[i]; }
      else if (t.dataset.qty) { const i = t.dataset.qty; if (st.picks[i] !== undefined) st.picks[i] = Math.max(1, Math.min(20, Number(t.value) || 1)); }
      later();
    });
    run();
  }

  // What's new: the team change log (src/worker/changelog.ts). A pop-up after each update; the full list at #/changelog.
  const fmtChangeDate = (d) => new Date(d + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  function changeEntryHtml(e) {
    return `<article class="change"><h3 style="margin:0 0 2px">${esc(e.title)}</h3>
      <p class="small muted" style="margin:0 0 6px">${esc(fmtChangeDate(e.date))}${e.android ? ` · Android ${esc(e.android)}` : ""}</p>
      <ul style="margin:0 0 4px;padding-left:20px">${e.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></article>`;
  }
  let whatsNewShown = false;
  async function maybeWhatsNew() {
    const w = meta && meta.whatsNew;
    if (whatsNewShown || !w || (w.seen != null && w.seen >= w.latest)) return;
    whatsNewShown = true;
    let data;
    try { data = await api("/changelog"); } catch (e) { return; }
    if (!data.unseen || !data.unseen.length) return;
    const box = document.createElement("div");
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "What's new");
    box.style.cssText = "position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px";
    box.innerHTML = `<section class="card" style="max-width:560px;width:100%;max-height:85vh;overflow:auto;margin:0">
      <h2 style="margin-top:0">📋 What's new</h2>
      <p class="small muted">What changed in the app since you last looked.</p>
      ${data.unseen.map(changeEntryHtml).join("<hr>")}
      <div class="btns"><button class="btn btn--primary" type="button" data-wn-ok>Got it</button><a class="btn" href="#/changelog" data-wn-all>See everything</a></div></section>`;
    const close = () => { box.remove(); api("/changelog/seen", { method: "POST" }).catch(() => {}); meta.whatsNew.seen = meta.whatsNew.latest; };
    box.querySelector("[data-wn-ok]").addEventListener("click", close);
    box.querySelector("[data-wn-all]").addEventListener("click", close);
    box.addEventListener("click", (ev) => { if (ev.target === box) close(); });
    document.body.appendChild(box);
    box.querySelector("[data-wn-ok]").focus();
  }

  async function viewChangelog() {
    setNav("settings");
    const my = renderSeq;
    $app.innerHTML = `<section class="card"><h2>📋 What's new</h2><p class="muted">Loading…</p></section>`;
    let data;
    try { data = await api("/changelog"); } catch (err) { if (stale(my)) return; $app.innerHTML = `<section class="card"><p class="bad">${esc(err.message || NO_CONNECTION)}</p></section>`; return; }
    if (stale(my)) return;
    $app.innerHTML = `<p><a href="#/settings">← Settings</a></p><h1>📋 What's new</h1>
      <p class="muted">Every update to the app, newest first. After an update, the new ones pop up once.</p>
      <input type="search" id="wnq" placeholder="Search the changes" style="width:100%;margin-bottom:12px">
      <div id="wnl">${data.entries.map((e) => `<section class="card" data-wn="${esc((e.title + " " + e.items.join(" ")).toLowerCase())}">${changeEntryHtml(e)}</section>`).join("")}</div>`;
    $app.querySelector("#wnq").addEventListener("input", (ev) => {
      const q = ev.target.value.trim().toLowerCase();
      $app.querySelectorAll("[data-wn]").forEach((c) => { c.hidden = !!q && !c.dataset.wn.includes(q); });
    });
    if (data.seen == null || data.seen < data.latest) { api("/changelog/seen", { method: "POST" }).catch(() => {}); if (meta && meta.whatsNew) meta.whatsNew.seen = data.latest; }
  }

  async function viewTraining() {
    setNav("home");
    const my = renderSeq;
    $app.innerHTML = `<section class="card"><h2>🎓 Training</h2><p class="muted">Loading…</p></section>`;
    let course;
    try { course = await api("/training"); } catch (err) { if (stale(my)) return; $app.innerHTML = `<section class="card"><p class="bad">${esc(err.message || NO_CONNECTION)}</p></section>`; return; }
    if (stale(my)) return;
    let done = new Set(course.done || []);
    const lessons = course.lessons;
    const total = lessons.reduce((n, l) => n + l.minutes, 0);
    const render = () => {
      const n = lessons.filter((l) => done.has(l.id)).length;
      const pct = Math.round((n / lessons.length) * 100);
      $app.innerHTML = `<section class="card"><h2>🎓 Training</h2>
        <p class="muted small">The whole job, from a lead appearing to a live site on the client's own domain. ${lessons.length} short lessons, about ${total} minutes in all. Each one has the exact buttons to tap, something to try, and a quick check. Your progress is saved.</p>
        <p><strong>${n === lessons.length ? "🎉 All done. Come back any time." : `${n} of ${lessons.length} done`}</strong></p>
        <div style="height:8px;border-radius:4px;background:var(--line,#ddd);overflow:hidden"><div style="width:${pct}%;height:100%;background:var(--primary,#fca311)"></div></div>
        <p class="small muted" style="margin-top:8px">Practice on the lead called <strong>Payment test (not a real business)</strong>: it only ever charges $1 and starts no plan.</p></section>
        ${lessons.map((l, i) => lessonHtml(l, i)).join("")}`;
      bind();
    };
    const lessonHtml = (l, i) => {
      const isDone = done.has(l.id);
      const ownerStep = l.who === "owner";
      return `<details class="card" data-lesson="${esc(l.id)}"${isDone ? "" : ""}>
        <summary style="cursor:pointer"><strong>${isDone ? "✅ " : `${i + 1}. `}${esc(l.title)}</strong> <span class="muted small">· ${l.minutes} min${ownerStep ? ` · <span class="chip">${isOwner() ? "Owner step" : "Owner does this; know what happens"}</span>` : ""}</span></summary>
        <p class="muted" style="margin-top:8px">${esc(l.why)}</p>
        <ol>${l.steps.map((s) => `<li style="margin-bottom:6px">${esc(s)}</li>`).join("")}</ol>
        ${l.tryIt ? `<div class="due" style="padding:10px;border-radius:8px;margin:8px 0"><strong>Try it now:</strong> ${esc(l.tryIt)}</div>` : ""}
        ${l.check.map((c, qi) => `<div class="small" style="margin:10px 0" data-q="${qi}"><strong>Quick check:</strong> ${esc(c.q)}
          ${c.options.map((o, oi) => `<label class="field" style="display:block;margin:4px 0"><input type="radio" name="q_${esc(l.id)}_${qi}" value="${oi}"> ${esc(o)}</label>`).join("")}
          <div class="small" data-result></div></div>`).join("")}
        <div class="btns"><button type="button" class="btn ${isDone ? "" : "btn--primary"}" data-done="${esc(l.id)}">${isDone ? "Mark not done" : "✓ Mark done"}</button></div>
      </details>`;
    };
    const bind = () => {
      $app.querySelectorAll("input[type=radio]").forEach((r) => r.addEventListener("change", () => {
        const [, id, qi] = /^q_(.+)_(\d+)$/.exec(r.name) || [];
        const lesson = lessons.find((l) => l.id === id);
        const c = lesson && lesson.check[Number(qi)];
        const out = r.closest("[data-q]").querySelector("[data-result]");
        if (c && out) out.innerHTML = Number(r.value) === c.answer ? `<span class="chip chip--good">Correct</span> ${esc(c.why)}` : `<span class="chip chip--bad">Not quite</span> ${esc(c.why)}`;
      }));
      $app.querySelectorAll("[data-done]").forEach((b) => b.addEventListener("click", async () => {
        const id = b.dataset.done;
        const open = [...$app.querySelectorAll("details[open]")].map((d) => d.dataset.lesson);
        try {
          const res = await api("/training/progress", { method: "PUT", body: JSON.stringify({ lesson: id, done: !done.has(id) }) });
          done = new Set(res.done || []);
        } catch (err) { toast(err.message || NO_CONNECTION); return; }
        render();
        open.forEach((o) => { const d = $app.querySelector(`details[data-lesson="${o}"]`); if (d && o !== id) d.open = true; });
        const next = lessons.find((l) => !done.has(l.id));
        if (next) { const d = $app.querySelector(`details[data-lesson="${next.id}"]`); if (d) { d.open = true; d.scrollIntoView({ behavior: "smooth", block: "start" }); } }
      }));
    };
    render();
  }

  async function viewPlaybook() {
    setNav("home");
    const s = meta.settings;
    const plans = s.plans.length ? s.plans : SUGGESTED_PLANS;
    const t = payTerms(s);
    const planCard = (p) => {
      const pitch = PLAN_PITCH[p.id] || { fit: "", points: [], line: "" };
      const includes = String(p.includes || "").split("\n").map((x) => x.trim()).filter(Boolean);
      return `<section class="card${p.id === "plus" ? " opener" : ""}"><h2>${esc(p.name)}: ${money(p.monthly)}/month${p.id === "plus" ? " ⭐ most pick this" : ""}</h2>
        <p class="small muted">${p.setup ? `${money(p.setup)} setup` : t.commits.length ? `No setup fee on the ${commitWords(t)} plan` : "No setup fee"} · billed monthly</p>
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
      <p><a class="btn btn--primary" href="#/plans">📋 Show the customer the plans</a> <a class="btn" href="/api/contract" target="_blank" rel="noopener">📄 Read the agreement</a></p>
      <section class="card"><h2>Which plan fits?</h2><p class="small muted">Lead with the middle plan. Go down if price is the worry, up if they want it all done for them.</p>
        <ul class="list">${PLAN_QUESTIONS.map(([q, a]) => `<li>${esc(q)} → <strong>${esc(a)}</strong></li>`).join("")}</ul></section>
      ${plans.map(planCard).join("")}
      <section class="card"><h2>Ways to pay</h2><ul class="list">${ways.map(([t, d]) => `<li><strong>${esc(t)}:</strong> ${d}</li>`).join("")}</ul>
        <p class="small muted">Send the sign-up link from the call guide. They pick the plan and the way to pay, read the agreement, and pay by a secure link. Never take card numbers over the phone.</p></section>
      ${(() => { const ct = payTerms(s, true); return ct.free ? `<section class="card"><h2>⛪ Churches &amp; nonprofits</h2><ul class="list">
        <li><strong>Yearly rate:</strong> 12 months for the price of ${12 - ct.free} (${ct.free} months free), so it fits one budget line. ${plans.filter((p) => p.monthly).map((p) => `${esc(p.name)} ${money(p.monthly * (12 - ct.free))}/year`).join(" · ")}.</li>
        <li><strong>Expect a check or an invoice:</strong> many pay from the church account, not a card. Say yes to that; the owner sends the invoice.</li>
        <li><strong>Decisions take a meeting:</strong> deacons, elders, a board or the post. Leave the flyer for it, ask when it is, and set the callback for the day after.</li></ul></section>` : ""; })()}
      ${[["general", "Extras", "Offer one when it fits. Any extra goes with any plan."], ["inventory", "Inventory add-ons", "The live price list system in pieces: offer these to shops whose stock changes, with the Price list plan or any website plan."]].map(([g, h, intro]) => { const list = (s.addons || []).filter((a) => addonGroup(a) === g); return list.length ? `<section class="card"><h2>${h}</h2><p class="small muted">${intro}</p><ul class="list">${list.map((a) => `<li><strong>${esc(a.name)}</strong> · ${esc(addonPrice(a))}${a.about ? `<br><span class="small">${esc(a.about)}</span>` : ""}${offerHint(a.name) ? `<br><span class="small muted">Offer to: ${esc(offerHint(a.name))}</span>` : ""}</li>`).join("")}</ul></section>` : ""; }).join("")}
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
  /* ---------- auto parts stores: the counter (what they carry is the services list) ---------- */
  const PARTS_COUNTER = [["battery", "Battery testing & charging"], ["install", "Wiper & bulb install"], ["loaner", "Loaner tools"], ["hose", "Hydraulic hose assembly"], ["machine", "Machine shop"], ["keys", "Key cutting"], ["paint", "Paint mixing"]];
  const PARTS_DEFAULT_ON = ["battery", "install", "loaner"];
  function partsEditCard(r, x, cb, serviceLines) {
    const p = x.parts || {};
    const counter = p.counter || {};
    const isOn = (id) => (id in counter ? !!counter[id] : PARTS_DEFAULT_ON.includes(id));
    return `<section class="card"><h2>Auto parts details</h2>
      ${autoKindField(r)}
      <p class="small muted">The site sells the counter: call to check stock, special orders, people who know the part. Only what the owner tells you.</p>
      <label class="field">What they carry (one per line)<textarea name="services" rows="8">${esc(serviceLines)}</textarea></label>
      <h3>Services at the counter</h3>
      ${PARTS_COUNTER.map(([id, label]) => cb("pc_" + id, label, isOn(id))).join("")}
      ${cb("partsCounterOk", "Owner confirmed this is the list (required)", !!p.counterConfirmed)}
      <label class="field">Special-order turnaround <span class="hint">Their words, e.g. “Most parts by the next morning.”</span><input name="partsTurnaround" maxlength="200" value="${esc(p.turnaround || "")}"></label>
      ${cb("partsCommercial", "They offer commercial accounts / delivery to shops", !!p.commercial)}
      <label class="field">Commercial accounts line (optional)<textarea name="partsCommercialText" rows="2" placeholder="Shops and fleets: ask about a commercial account and twice-daily delivery.">${esc(p.commercialText || "")}</textarea></label>
      <div class="row"><label class="field">Buying group / program<input name="partsProgram" maxlength="60" value="${esc(p.program || "")}" placeholder="NAPA, Carquest, Parts Plus…"></label>
      <label class="field">Its online ordering page (for pickup)<input name="partsOrderUrl" type="url" value="${esc(p.orderUrl || "")}" placeholder="https://"></label></div>
      <p class="small muted">With an ordering link, the site gets an “Order online for pickup” button and the text may mention it. Without one it never claims online ordering, shipping or prices.</p>
    </section>`;
  }
  function partsEditValues(f) {
    const v = (n) => (f.elements[n] ? f.elements[n].value.trim() : undefined);
    const on = (n) => (f.elements[n] ? f.elements[n].checked : undefined);
    const counter = {};
    PARTS_COUNTER.forEach(([id]) => { counter[id] = !!on("pc_" + id); });
    return { counter, counterConfirmed: on("partsCounterOk"), turnaround: v("partsTurnaround"), commercial: on("partsCommercial"), commercialText: v("partsCommercialText"), program: v("partsProgram"), orderUrl: v("partsOrderUrl") };
  }

  /* ---------- trades, lawn & cleaning (Oct 2026): plans, guarantee, offers, gallery captions, category details ---------- */
  const photoKey = (src) => src.split("/").pop().split(".")[0];
  function galleryMetaValues(f, r) {
    const out = {};
    for (const p of r.media.gallery) {
      const key = photoKey(p.src);
      if (!f.elements["gcap_" + key]) continue;
      out[p.src] = { caption: f.elements["gcap_" + key].value.trim(), town: (f.elements["gtown_" + key] || { value: "" }).value.trim(), pairWith: (f.elements["gpair_" + key] || { value: "" }).value };
      if (f.elements["gnew_" + key]) out[p.src].whatsNew = f.elements["gnew_" + key].checked;
      if (f.elements["gfocus_" + key]) out[p.src].focus = f.elements["gfocus_" + key].value;
    }
    return Object.keys(out).length ? out : undefined;
  }
  const PLAN_HINT = {
    contractor: ["Comfort plan", "$149", "year", "Most popular", "Two tune-ups a year\n15% off repairs\nPriority scheduling"],
    landscaping: ["Every 2 weeks", "$45", "visit", "Most popular", "Mowing & edging\nTrimming\nBlowing off drives and walks"],
    cleaning: ["Every 2 weeks", "$120", "visit", "Most popular", "Kitchen and baths\nDusting and floors\nBeds made"],
  };
  function plansEditCard(r) {
    const h = PLAN_HINT[r.category] || PLAN_HINT.cleaning;
    const list = (r.plans || []).concat([{}, {}, {}]).slice(0, 3);
    const lawn = r.category === "landscaping" && r.variant === "lawn_crew";
    return `<section class="card"><h2>Plans &amp; pricing</h2>
      <p class="small muted">Up to 3 cards: ${r.category === "contractor" ? "maintenance or service plans (HVAC, pest, garage doors)" : r.category === "landscaping" ? "ways to work with us (weekly, every 2 weeks, one-time)" : r.variant === "exterior" ? "flat-rate packages" : "recurring tiers"}. Prices are optional and always shown as starting points.${lawn ? " Lawn sites show weekly / every 2 weeks / one-time cards with no prices until you fill these in; one named plan here replaces them." : ""}</p>
      ${list.map((p, i) => `<details class="more"${p.name ? " open" : ""}><summary>Plan ${i + 1}${p.name ? ": " + esc(p.name) : ""}</summary>
        <div class="row"><label class="field">Name<input name="plan${i}_name" maxlength="60" value="${esc(p.name || "")}" placeholder="${esc(h[0])}"></label><label class="field">Badge<input name="plan${i}_badge" maxlength="30" value="${esc(p.badge || "")}" placeholder="${esc(h[3])}"></label></div>
        <div class="row"><label class="field">Price (optional)<input name="plan${i}_price" maxlength="30" value="${esc(p.price || "")}" placeholder="${esc(h[1])}"></label><label class="field">Per<input name="plan${i}_unit" maxlength="30" value="${esc(p.unit || "")}" placeholder="${esc(h[2])}"></label></div>
        <label class="field">What's included (one per line)<textarea name="plan${i}_includes" rows="4" placeholder="${esc(h[4])}">${esc((p.includes || []).join("\n"))}</textarea></label>
        <label class="field">Note (optional)<input name="plan${i}_note" maxlength="160" value="${esc(p.note || "")}" placeholder="Cancel any time."></label>
      </details>`).join("")}
    </section>`;
  }
  function plansEditValues(f) {
    const v = (n) => (f.elements[n] ? f.elements[n].value.trim() : "");
    const out = [];
    for (let i = 0; i < 3; i++) {
      if (!f.elements["plan" + i + "_name"]) return undefined;
      const name = v("plan" + i + "_name");
      if (!name) continue;
      out.push({ name, price: v("plan" + i + "_price"), unit: v("plan" + i + "_unit"), badge: v("plan" + i + "_badge"), note: v("plan" + i + "_note"), includes: v("plan" + i + "_includes").split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 8) });
    }
    return out;
  }
  function guaranteeEditCard(r, isK) {
    const g = r.guarantee || {};
    return `<section class="card"><h2>Guarantee</h2>
      <p class="small muted">Only in the owner's words; the site shows nothing here until something is typed. It becomes a trust chip, a line under the services and an FAQ answer.</p>
      <div class="row"><label class="field">Window<input name="gWindow" maxlength="40" value="${esc(g.window || "")}" placeholder="${isK ? "24 hours" : "30 days"}"></label>
      <label class="field">What they do<input name="gRemedy" maxlength="160" value="${esc(g.remedy || "")}" placeholder="${isK ? "we'll come back and re-clean it free" : "we come back and make it right"}"></label></div>
      <label class="field">Or the whole line, their way (optional)<input name="gText" maxlength="240" value="${esc(g.text || "")}" placeholder="${isK ? "Not happy with a room? Tell us within 24 hours and we'll re-clean it free." : ""}"></label>
    </section>`;
  }
  function guaranteeEditValues(f) {
    if (!f.elements.gWindow) return undefined;
    const v = (n) => f.elements[n].value.trim();
    return { window: v("gWindow"), remedy: v("gRemedy"), text: v("gText") };
  }
  function offersEditCard(r) {
    return `<section class="card"><h2>Offers &amp; coupons</h2>
      <p class="small muted">One per line as <b>offer | code | expires | details</b>. Code and details are optional; expires is YYYY-MM-DD and the offer hides itself after that day. The first one shows as a bar under the opening, the rest as cards.</p>
      <label class="field">Offers<textarea name="offers" rows="3" placeholder="$25 off your first clean | WEB25 | 2026-12-31 | New customers, mention this website.&#10;Free second opinion on any repair quote | | |">${esc(offerLines(r.offers))}</textarea></label>
    </section>`;
  }
  function offerLines(offers) {
    return (offers || []).map((o) => [o.title, o.code || "", o.expiresOn || "", o.detail || ""].join(" | ").replace(/( \|\s*)+$/, "")).join("\n");
  }
  function parseOfferLines(text) {
    const out = [];
    for (const line of text.split("\n")) {
      const parts = line.split("|").map((x) => x.trim());
      if (!parts[0]) continue;
      const o = { title: parts[0].slice(0, 80) };
      if (parts[1]) o.code = parts[1].slice(0, 30);
      if (parts[2]) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(parts[2])) { toast(`Offer "${o.title}" needs an expiry like 2026-12-31 (or leave it blank).`); continue; }
        o.expiresOn = parts[2];
      }
      if (parts[3]) o.detail = parts[3].slice(0, 160);
      out.push(o);
    }
    return out.slice(0, 6);
  }
  function contractorEditCard(r, x, cb) {
    const fin = x.financing || {};
    const ah = x.afterHours || {};
    const hvac = r.variant === "hvac";
    const remodel = r.variant === "remodeling";
    return `<section class="card"><h2>Contractor details</h2>
      <label class="field">Who they work with<select name="cServes"><option value="">Not set</option>${[["residential", "Homeowners"], ["commercial", "Businesses"], ["both", "Both homes and businesses"]].map(([v, t]) => `<option value="${v}"${x.serves === v ? " selected" : ""}>${t}</option>`).join("")}</select></label>
      <h3>Financing</h3>
      <p class="small muted">Name the lender and paste their application link. The site says “Financing available” and “Apply with &lt;lender&gt;”; it never states rates, 0% or approval odds.</p>
      <div class="row"><label class="field">Lender<input name="cFinLender" maxlength="60" value="${esc(fin.lender || "")}" placeholder="Wisetack, GreenSky, Synchrony…"></label>
      <label class="field">Application link<input name="cFinUrl" type="url" value="${esc(fin.url || "")}" placeholder="https://"></label></div>
      <label class="field">Warranty, in their words<textarea name="cWarranty" rows="2" maxlength="300" placeholder="Our workmanship is covered for one year. If something we did fails, we come back and fix it at no charge.">${esc(x.warrantyText || "")}</textarea></label>
      <h3>Emergency calls</h3>
      <p class="small muted">${x.emergencyService ? "“Offers emergency service” is on, so the site shows an “Emergency? Call…” line under the header. Required before publishing: confirm the terms." : "Tick “Offers emergency service” under Facts to show an emergency line."}</p>
      <div class="row"><label class="field">After-hours number (if different)<input name="cAhPhone" type="tel" maxlength="30" value="${esc(ah.phone || "")}" placeholder="(256) 555-0199"></label>
      <label class="field">Terms, their words<input name="cAhNote" maxlength="160" value="${esc(ah.note || "")}" placeholder="Nights and weekends; after-hours rates apply"></label></div>
      ${cb("cAhOk", "Owner confirmed the emergency terms (hours, extra charges)" + (x.emergencyService ? " (required)" : ""), !!ah.confirmed)}
      ${hvac ? `<p class="small muted"><b>Alabama HVAC rule:</b> the AL# certification number must be on the home page. Type it under License # in Facts; the site shows “AL# …” next to the name.</p>` : ""}
      ${remodel ? cb("cOver10k", "They take jobs over $10,000 (Alabama then requires the HBLB license number on the site)", !!x.jobsOver10k) : ""}
    </section>`;
  }
  function contractorEditValues(f) {
    const v = (n) => (f.elements[n] ? f.elements[n].value.trim() : undefined);
    const on = (n) => (f.elements[n] ? f.elements[n].checked : undefined);
    const out = { serves: v("cServes"), financingLender: v("cFinLender"), financingUrl: v("cFinUrl"), warrantyText: v("cWarranty"), afterHoursPhone: v("cAhPhone"), afterHoursNote: v("cAhNote"), afterHoursConfirmed: on("cAhOk"), jobsOver10k: on("cOver10k") };
    return Object.fromEntries(Object.entries(out).filter(([, x]) => x !== undefined));
  }
  function landscapingEditCard(r, x, cb) {
    return `<section class="card"><h2>Lawn &amp; landscape details</h2>
      ${cb("lSeasonal", "Show a 4-season “what we do when” calendar (built from the services list, North Alabama timing)", !!x.seasonal)}
      <label class="field">ADAI permit # <span class="hint">Required before publishing if the services include fertilizing, weed control or pest treatments</span><input name="lAdai" maxlength="40" value="${esc(x.adaiPermit || "")}"></label>
      <label class="field">Meet the crew (one line, their words)<input name="lCrew" maxlength="160" value="${esc(x.crew || "")}" placeholder="Owner-operated: Jake runs every job."></label>
    </section>`;
  }
  function landscapingEditValues(f) {
    const v = (n) => (f.elements[n] ? f.elements[n].value.trim() : undefined);
    const on = (n) => (f.elements[n] ? f.elements[n].checked : undefined);
    const out = { seasonal: on("lSeasonal"), adaiPermit: v("lAdai"), crew: v("lCrew") };
    return Object.fromEntries(Object.entries(out).filter(([, x]) => x !== undefined));
  }
  const CHECKLIST_ROOMS = ["Every room", "Kitchen", "Bathrooms", "Bedrooms", "Living areas"];
  const CLEANING_FACILITIES = ["Offices", "Medical & dental", "Churches", "Schools & daycares", "Retail stores", "Restaurants", "Banks", "Gyms", "Industrial & warehouses", "Apartment common areas", "Vacation rentals", "Post-construction"];
  function cleaningEditCard(r, x, cb) {
    if (r.variant === "commercial") {
      const fac = new Set(x.facilities || []);
      return `<section class="card"><h2>Commercial cleaning details</h2>
        <p class="small muted">The site asks for a walkthrough, then a written scope and a schedule. Tick only the building types they really clean.</p>
        <h3>Buildings they clean</h3>
        ${CLEANING_FACILITIES.map((n, i) => cb("kFac_" + i, n, fac.has(n))).join("")}
        <label class="field">How often, their words<input name="kFreq" maxlength="120" value="${esc(x.frequency || "")}" placeholder="Nightly, weekly or on your schedule"></label>
        ${cb("kAfterHours", "They clean after hours", !!x.afterHours)}
      </section>`;
    }
    if (r.variant !== "residential") return "";
    const c = x.checklist || { rooms: [], tiers: [], extras: [] };
    const rooms = CHECKLIST_ROOMS.concat((c.rooms || []).map((rm) => rm.room).filter((n) => !CHECKLIST_ROOMS.includes(n)));
    const tasksOf = (name) => { const rm = (c.rooms || []).find((q) => q.room === name); return rm ? rm.tasks.join("\n") : ""; };
    return `<section class="card"><h2>What's included</h2>
      <p class="small muted">Their checklist, one task per line. Name the tiers (e.g. <b>Standard, Deep, Move-out</b>), then tag a task that's only in some tiers with <b>@deep</b> or <b>@move</b>; untagged tasks are in every tier. It renders as a tick-box comparison table.</p>
      <label class="field">Tiers (comma separated)<input name="kTiers" maxlength="120" value="${esc((c.tiers || []).join(", "))}" placeholder="Standard, Deep, Move-out"></label>
      ${rooms.map((name, i) => `<label class="field">${esc(name)}<textarea name="kRoom_${i}" data-room="${esc(name)}" rows="3" placeholder="${i === 1 ? "Counters and sink\nOutside of appliances\nInside the oven @deep @move" : i === 0 ? "Dust surfaces\nVacuum and mop floors\nBaseboards @deep @move" : ""}">${esc(tasksOf(name))}</textarea></label>`).join("")}
      <label class="field">May cost extra (one per line)<textarea name="kExtras" rows="3" placeholder="Inside the fridge&#10;Interior windows&#10;Laundry">${esc((c.extras || []).join("\n"))}</textarea></label>
    </section>`;
  }
  function cleaningEditValues(f, r) {
    const v = (n) => (f.elements[n] ? f.elements[n].value.trim() : undefined);
    const on = (n) => (f.elements[n] ? f.elements[n].checked : undefined);
    const lines = (n) => f.elements[n].value.split("\n").map((x) => x.trim()).filter(Boolean);
    if (r.variant === "commercial") {
      if (!f.elements.kFreq) return undefined;
      return { facilities: CLEANING_FACILITIES.filter((n, i) => on("kFac_" + i)), frequency: v("kFreq"), afterHours: !!on("kAfterHours") };
    }
    if (!f.elements.kTiers) return undefined;
    const rooms = [];
    for (const ta of f.querySelectorAll("textarea[data-room]")) { const tasks = ta.value.split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 30); if (tasks.length) rooms.push({ room: ta.dataset.room, tasks }); }
    return { checklist: { rooms, tiers: v("kTiers").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 4), extras: lines("kExtras").slice(0, 20) } };
  }
  /* ---------- auto repair shops: amenities, programs, financing, and the towing / tire / body modules (research/trends-2026 §1) ---------- */
  /** Kinds of auto business the auto template builds (mirrors AUTO_VARIANT_LABELS in packs/auto.ts). */
  const AUTO_KINDS = [["general", "Auto Repair"], ["tire", "Tires & Auto Repair"], ["transmission", "Transmission Repair"], ["diesel", "Diesel & Auto Repair"], ["european", "Import Auto Repair"], ["towing", "Towing & Roadside"], ["tow_repair", "Towing & Auto Repair"], ["body", "Auto Body & Collision Repair"], ["detailing", "Auto Detailing"], ["small_engine", "Small Engine Repair"], ["glass", "Auto Glass"], ["exhaust", "Muffler & Exhaust"], ["parts", "Auto Parts Store"]];
  const autoKindField = (r) => `<label class="field">Kind of shop <select name="autoKind">${AUTO_KINDS.map(([k, l]) => `<option value="${k}"${r.variant === k ? " selected" : ""}>${l}</option>`).join("")}</select></label><p class="small muted">Change it if Google got it wrong (a parts store built as a repair shop sells parts, not repairs). The sections switch when you save and the text is rewritten for the new kind.</p>`;
  const AUTO_AMENITIES = [["loaner", "Loaner cars"], ["shuttle", "Shuttle service"], ["key_drop", "After-hours key drop"], ["wifi", "Waiting room with Wi-Fi"], ["digital_inspection", "Digital inspections texted to you"], ["second_opinion", "Free second opinions"], ["walk_ins", "Walk-ins welcome"], ["same_day", "Same-day service on most jobs"], ["towing", "Towing available"], ["spanish", "Spanish spoken"]];
  const AUTO_PROGRAMS = ["NAPA AutoCare", "TechNet", "Jasper", "AAA Approved Auto Repair", "Bosch Service", "ASE Blue Seal", "RepairPal Certified", "BBB Accredited"];
  function autoEditCard(r, x, cb) {
    const v = r.variant;
    const on = new Set(x.amenities || []);
    const programs = x.programs || [];
    const other = programs.filter((p) => !AUTO_PROGRAMS.includes(p));
    const fin = x.financing || {};
    const tow = x.tow || {};
    const body = x.body || {};
    const inp = (name, label, value, ph, type) => `<label class="field">${label}<input name="${name}" type="${type || "text"}" value="${esc(value || "")}" placeholder="${esc(ph || "")}"></label>`;
    return `<section class="card"><h2>Auto shop details</h2>
      ${autoKindField(r)}
      <p class="small muted">Only what the owner confirms. Amenities go in a “Good to know” row under the opening; programs show as plain text (no logos).</p>
      <h3>Good to know</h3>
      ${AUTO_AMENITIES.map(([id, label]) => cb("am_" + id, label, on.has(id))).join("")}
      <h3>Programs they belong to</h3>
      ${AUTO_PROGRAMS.map((p, i) => cb("pg_" + i, p, programs.includes(p))).join("")}
      ${inp("autoProgramsOther", "Other programs (comma separated)", other.join(", "), "Mitchell 1, Interstate Batteries dealer")}
      <div class="row">${inp("autoFinLender", "Financing through <span class=\"hint\">lender name only; the site never states approval odds or “no credit check”</span>", fin.lender, "Synchrony Car Care")}${inp("autoFinUrl", "Apply link (optional)", fin.url, "https://", "url")}</div>
      ${v === "towing" || v === "tow_repair" ? `<h3>Towing</h3>
        ${inp("towPhone", "Tow line (if different from the shop number)", tow.phone, "(256) 555-0100", "tel")}
        ${cb("towAlways", "Tow line is staffed 24/7 (owner confirmed; required before the site may say 24/7)", !!tow.always)}
        ${inp("towYard", "Yard / pickup note (optional)", tow.yardNote, "Yard pickup weekdays 8 to 5; bring your ID and proof of ownership.")}` : ""}
      ${v === "tire" ? `<h3>Tires</h3>
        <label class="field">Brands they carry (one per line)<textarea name="tireBrands" rows="4" placeholder="Michelin&#10;Goodyear&#10;Cooper">${esc((x.tireBrands || []).join("\n"))}</textarea></label>
        ${inp("tireStoreUrl", "Online tire store (adds “Shop tires online”)", x.storeUrl, "https://", "url")}` : ""}
      ${v === "body" ? `<h3>Body shop</h3>
        <label class="field">Insurance companies they work with (one per line)<textarea name="bodyInsurers" rows="4" placeholder="State Farm&#10;Alfa&#10;Progressive">${esc((body.insurers || []).join("\n"))}</textarea></label>
        <label class="field">Certifications (one per line, their words)<textarea name="bodyCerts" rows="3" placeholder="I-CAR Gold Class&#10;Ford Certified Collision Network">${esc((body.certifications || []).join("\n"))}</textarea></label>
        ${cb("bodyRight", "Show the “You choose the shop” right-to-choose line (owner confirmed)", !!body.rightToChooseConfirmed)}
        ${inp("bodyEstimate", "Estimate note (optional)", body.estimateNote, "Text us photos of the damage and we'll give you a rough estimate the same day.")}
        <p class="small muted">Before/after photos go in the Photo gallery card above (send 3 pairs).</p>` : ""}
    </section>`;
  }
  function autoEditValues(f, r) {
    const v = (n) => (f.elements[n] ? f.elements[n].value.trim() : undefined);
    const on = (n) => (f.elements[n] ? f.elements[n].checked : undefined);
    const lines = (n) => (f.elements[n] ? f.elements[n].value.split("\n").map((x) => x.trim()).filter(Boolean) : undefined);
    const programs = AUTO_PROGRAMS.filter((p, i) => on("pg_" + i)).concat((v("autoProgramsOther") || "").split(",").map((x) => x.trim()).filter(Boolean));
    const out = {
      amenities: AUTO_AMENITIES.map(([id]) => id).filter((id) => on("am_" + id)),
      programs,
      financing: v("autoFinLender") ? { lender: v("autoFinLender"), url: v("autoFinUrl") || "" } : null,
      tow: r.variant === "towing" || r.variant === "tow_repair" ? { phone: v("towPhone") || "", always: !!on("towAlways"), yardNote: v("towYard") || "" } : undefined,
      tireBrands: r.variant === "tire" ? lines("tireBrands") : undefined,
      storeUrl: r.variant === "tire" ? v("tireStoreUrl") : undefined,
      body: r.variant === "body" ? { insurers: lines("bodyInsurers") || [], certifications: lines("bodyCerts") || [], rightToChooseConfirmed: !!on("bodyRight"), estimateNote: v("bodyEstimate") || "" } : undefined,
    };
    return Object.fromEntries(Object.entries(out).filter(([, x]) => x !== undefined));
  }

  /* ---------- shops: donations (on by default for thrift stores) ---------- */
  function donationsEditCard(r, x, cb) {
    const d = x.donations || {};
    const thrift = r.variant === "thrift";
    const enabled = d.enabled === undefined ? thrift : !!d.enabled;
    return `<section class="card"><h2>Donations</h2>
      <p class="small muted">${thrift ? "Thrift sites have two jobs: are you open, and what can I donate. Required until the lists and hours are filled in." : "For shops that take donations (resale, church stores, animal rescue shops)."} Only their own list.</p>
      ${cb("donEnabled", "Show a Donations section", enabled)}
      <label class="field">We gladly take (one per line)<textarea name="donAccepts" rows="5" placeholder="Clothing and shoes&#10;Housewares&#10;Furniture in good shape&#10;Books and toys">${esc((d.accepts || []).join("\n"))}</textarea></label>
      <label class="field">We can't take (one per line)<textarea name="donNo" rows="4" placeholder="Mattresses&#10;TVs and old electronics&#10;Car seats and cribs">${esc((d.doesNotAccept || []).join("\n"))}</textarea></label>
      <label class="field">Drop-off hours<input name="donHours" maxlength="200" value="${esc(d.dropOffHours || "")}" placeholder="Monday to Saturday, 10 to 4, at the back door"></label>
      ${cb("donPickup", "They pick up furniture (adds a pickup request form)", !!d.pickup)}
      <label class="field">Pickup note (optional)<input name="donPickupNote" maxlength="300" value="${esc(d.pickupNote || "")}" placeholder="We pick up in Cullman County on Tuesdays and Thursdays."></label>
      ${cb("donReceipts", "They're a nonprofit and give donation receipts", !!d.receipts)}
      <label class="field">Intro line (optional)<input name="donNote" maxlength="400" value="${esc(d.note || "")}" placeholder="Every donation helps fund the food pantry next door."></label>
    </section>`;
  }
  function donationsEditValues(f) {
    const v = (n) => (f.elements[n] ? f.elements[n].value.trim() : undefined);
    const on = (n) => (f.elements[n] ? f.elements[n].checked : undefined);
    const lines = (n) => (f.elements[n] ? f.elements[n].value.split("\n").map((x) => x.trim()).filter(Boolean) : undefined);
    const out = { enabled: on("donEnabled"), accepts: lines("donAccepts"), doesNotAccept: lines("donNo"), dropOffHours: v("donHours"), pickup: on("donPickup"), pickupNote: v("donPickupNote"), receipts: on("donReceipts"), note: v("donNote") };
    return Object.fromEntries(Object.entries(out).filter(([, x]) => x !== undefined));
  }

  function churchEditCard(r, x, cb) {
    const v = r.variant;
    const fv = x.firstVisit || {};
    const p = x.pastor || {};
    const ta = (name, label, value, rows, ph) => `<label class="field">${label}<textarea name="${name}" rows="${rows}" placeholder="${esc(ph || "")}">${esc(value || "")}</textarea></label>`;
    const inp = (name, label, value, ph, type) => `<label class="field">${label}<input name="${name}" type="${type || "text"}" value="${esc(value || "")}" placeholder="${esc(ph || "")}"></label>`;
    const k = x.kids || {};
    const hd = x.hallDetails || {};
    const lines = (x.schedule || []).map((s) => `${s.day} | ${s.time} | ${s.label}${s.lang === "es" ? " | es" : ""}`).join("\n");
    return `<section class="card"><h2>Church &amp; nonprofit details</h2>
      <p class="small muted">Only their own words. We never write beliefs, history or claims for them.</p>
      <label class="field">Kind of group<select name="chVariant">${CH_VARIANTS.map(([k, t]) => `<option value="${k}"${k === v ? " selected" : ""}>${t}</option>`).join("")}</select></label>
      ${v === "church" ? `${inp("chLabel", "How they describe their church <span class=\"hint\">e.g. “Missionary Baptist church”, or just “Church”</span>", x.traditionLabel)}
        ${cb("chLabelOk", "They confirmed this wording (required)", !!x.traditionConfirmed)}
        ${ta("chSchedule", "Service times, one per line: <code>Day | Time | What</code> <span class=\"hint\">add <code>| es</code> for a Spanish service</span>", lines, 5, "Sunday | 9:45 AM | Sunday School\nSunday | 11:00 AM | Worship\nSunday | 2:00 PM | Servicio en español | es\nWednesday | 6:30 PM | Prayer & Bible Study")}
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
        ${inp("chFacility", "Weddings & facility use (their policy)", x.facility)}
        <h3>Kids &amp; students (their words)</h3>
        ${inp("chKidsNursery", "Nursery", k.nursery, "Birth through age 3, during Sunday School and worship")}${inp("chKidsKids", "Kids", k.kids, "Children's church for K to 5th grade during the 11:00 service")}
        ${inp("chKidsStudents", "Students", k.students, "Youth meet Wednesdays at 6:30 in the fellowship hall")}${inp("chKidsCheckIn", "Check-in (only if they really do it)", k.checkIn)}
        <h3>Links</h3>
        ${inp("chPlanVisit", "Their own Plan-a-visit form (Church Center, Tithely…)", x.planVisitUrl, "https://", "url")}
        ${inp("chConnectCard", "Connect card link", x.connectCardUrl, "https://", "url")}
        ${inp("chPrayer", "Prayer requests go to <span class=\"hint\">a link, mailto:pastor@… or sms:+1256…; we never store requests</span>", x.prayerUrl, "mailto:")}
        ${inp("chBulletin", "Bulletin / newsletter link", x.bulletinUrl, "https://", "url")}
        ${inp("chApp", "Church app link", x.appUrl, "https://", "url")}
        ${inp("chPodcast", "Podcast link", x.podcastUrl, "https://", "url")}
        ${inp("chLiveNote", "Watch line (their words)", x.liveNote, "Live Sundays at 10:30 on Facebook")}` : ""}
      ${v === "charity" ? `${ta("chHelp", "Getting help: days, hours, who can come, what to bring (required)", x.help, 4)}` : ""}
      ${v === "civic_post" ? `${inp("chMeetings", "When and where they meet (required)", x.meetings, "2nd Tuesday, 6:30 PM, at the post home")}
        ${ta("chJoinText", "Who can join and how (their words)", x.joinText, 3)}${inp("chJoinUrl", "Join link (optional)", x.joinUrl, "https://", "url")}` : ""}
      ${v === "civic_post" || v === "community_center" ? `${inp("chHall", "Hall rental (a sentence or two)", x.hall)}
        <div class="row">${inp("chHallCap", "Seats (number)", hd.capacity, "150")}${inp("chHallTables", "Tables & chairs", hd.tables, "20 round tables, 160 chairs")}</div>
        ${cb("chHallKitchen", "Kitchen available", !!hd.kitchen)}
        ${inp("chHallHow", "How to book", hd.how, "Call the post home Tuesday to Friday, 10 to 2.")}` : ""}
      ${v === "charity" ? inp("chVolunteerUrl", "Volunteer sign-up link", x.volunteerUrl, "https://", "url") : ""}
      ${v !== "church" ? `${inp("chDonate", "Donate link", x.donateUrl, "https://", "url")}${inp("chNeeded", "Items they need", x.needed)}${inp("chVolunteer", "How to volunteer", x.volunteer)}
        ${inp("chStatus", "Nonprofit status line (their words)", x.statusText, "We're a 501(c)(3); gifts are tax-deductible.")}
        ${cb("chStatusOk", "They confirmed this status line", !!x.deductibleConfirmed)}` : ""}
    </section>`;
  }
  function churchEditValues(f) {
    const v = (n) => (f.elements[n] ? f.elements[n].value.trim() : undefined);
    const on = (n) => (f.elements[n] ? f.elements[n].checked : undefined);
    const sched = f.elements.chSchedule ? f.elements.chSchedule.value.split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((p) => p.length >= 2 && p[0]).map((p) => {
      const es = p.length >= 4 && /^es$/i.test(p[p.length - 1]);
      const parts = es ? p.slice(0, -1) : p;
      const row = parts.length === 2 ? { day: parts[0], time: "", label: parts[1] } : { day: parts[0], time: parts[1], label: parts.slice(2).join(" ") || parts[1] };
      return es ? Object.assign(row, { lang: "es" }) : row;
    }) : undefined;
    const out = {
      variant: v("chVariant"), traditionLabel: v("chLabel"), traditionConfirmed: on("chLabelOk"), schedule: sched, scheduleConfirmed: on("chScheduleOk"),
      firstVisit: f.elements.chParking ? { parking: v("chParking"), dress: v("chDress"), kids: v("chKids"), length: v("chLength"), music: v("chMusic"), accessibility: v("chAccess") } : undefined,
      pastor: f.elements.chPastorName ? { name: v("chPastorName"), title: v("chPastorTitle"), bio: f.elements.chPastorBio.value.trim() } : undefined,
      pastorOff: on("chPastorOff"), beliefs: f.elements.chBeliefs ? f.elements.chBeliefs.value.trim() : undefined, beliefsUrl: v("chBeliefsUrl"),
      givingUrl: v("chGive"), liveUrl: v("chLive"), sermonsUrl: v("chSermons"), spanish: on("chSpanish"), facility: v("chFacility"),
      help: f.elements.chHelp ? f.elements.chHelp.value.trim() : undefined, meetings: v("chMeetings"), joinText: f.elements.chJoinText ? f.elements.chJoinText.value.trim() : undefined, joinUrl: v("chJoinUrl"), hall: v("chHall"),
      donateUrl: v("chDonate"), needed: v("chNeeded"), volunteer: v("chVolunteer"), statusText: v("chStatus"), deductibleConfirmed: on("chStatusOk"),
      kids: f.elements.chKidsNursery ? { nursery: v("chKidsNursery"), kids: v("chKidsKids"), students: v("chKidsStudents"), checkIn: v("chKidsCheckIn") } : undefined,
      planVisitUrl: v("chPlanVisit"), connectCardUrl: v("chConnectCard"), prayerUrl: v("chPrayer"), bulletinUrl: v("chBulletin"), appUrl: v("chApp"), podcastUrl: v("chPodcast"), liveNote: v("chLiveNote"),
      hallDetails: f.elements.chHallCap ? { capacity: v("chHallCap"), kitchen: !!on("chHallKitchen"), tables: v("chHallTables"), how: v("chHallHow") } : undefined,
      volunteerUrl: v("chVolunteerUrl"),
    };
    return Object.fromEntries(Object.entries(out).filter(([, x]) => x !== undefined));
  }

  /* ---------- tax & finance: what the owner must confirm (research/tax-finance.md §5) ---------- */
  /** Financial advisors may not use testimonials or reviews (Alabama 830-X-3-.22, SEC/FINRA rules). */
  const noReviews = (l) => l.category === "finance" && (l.record ? l.record.variant : "") === "financial_advisor";
  const FIN_VARIANTS = [["tax_prep", "Tax preparation"], ["accounting", "Accounting & bookkeeping"], ["insurance", "Insurance agency"], ["financial_advisor", "Financial advisor"]];
  const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  /** "Name | pay URL | claims phone | claims URL" per line; names-only lines stay plain names. */
  function carrierLines(list) {
    return (list || []).map((c) => (typeof c === "string" ? c : [c.name, c.payUrl || "", c.claimsPhone || "", c.claimsUrl || ""].join(" | ").replace(/( \|\s*)+$/, ""))).join("\n");
  }
  function parseCarrierLines(text) {
    return text.split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((p) => p[0]).map((p) => (p.length === 1 ? p[0] : { name: p[0], payUrl: p[1] || undefined, claimsPhone: p[2] || undefined, claimsUrl: p[3] || undefined }));
  }
  function financeEditCard(r, x, cb) {
    const v = r.variant;
    const modes = x.modes || [];
    const sh = x.seasonHours || {};
    const ara = x.advisorReviewsApproved || {};
    const peopleLines = (x.people || []).map((p) => [p.name, p.title || "", p.credentials || "", p.line || ""].join(" | ").replace(/( \|\s*)+$/, "")).join("\n");
    const feeLines = (x.fees || []).map((p) => `${p.service} | ${p.price}`).join("\n");
    const ta = (name, label, value, rows, ph) => `<label class="field">${label}<textarea name="${name}" rows="${rows}" placeholder="${esc(ph || "")}">${esc(value || "")}</textarea></label>`;
    const inp = (name, label, value, ph, type) => `<label class="field">${label}<input name="${name}" type="${type || "text"}" value="${esc(value || "")}" placeholder="${esc(ph || "")}"></label>`;
    return `<section class="card"><h2>Tax &amp; finance details</h2>
      <p class="small muted">Only what the owner tells you. Required checks block publishing until they're ticked.</p>
      <label class="field">Type of office<select name="finVariant">${FIN_VARIANTS.map(([k, t]) => `<option value="${k}"${k === v ? " selected" : ""}>${t}</option>`).join("")}</select></label>
      ${inp("finCredentials", "Credentials line <span class=\"hint\">Their exact words, e.g. “Enrolled Agent” or “Jane Smith, CPA”</span>", x.credentials)}
      ${cb("finCredentialsConfirmed", "Owner confirmed the credentials line is right", !!x.credentialsConfirmed)}
      ${ta("finPeople", "Who you'll work with, one person per line: <code>Name | Title | Credentials | One line</code>", peopleLines, 4, "Jane Smith | Owner | Enrolled Agent | Jane has prepared returns in Cullman since 2009.\nTom Lee | Bookkeeper | | Tom keeps the books for a dozen local businesses.")}
      ${cb("finPeopleOk", "Owner confirmed every name and credential above (required while anyone is listed)", !!x.peopleConfirmed)}
      ${inp("finWhoWeServe", "Who they serve (their words, optional)", x.whoWeServe, "farms, trucking companies and small contractors")}
      ${ta("finFees", "Published fees (optional), one per line: <code>Service | Price</code> <span class=\"hint\">Published fees must be honored for 30 days after a change.</span>", feeLines, 3, "Form 1040 with W-2s | from $150\nSchedule C | from $250")}
      ${inp("finFeesAsOf", "Fees as of (month and year)", x.feesAsOf, MONTHS_LONG[new Date().getMonth()] + " " + new Date().getFullYear())}
      ${v === "tax_prep" ? `${cb("finPtin", "Owner confirmed every paid preparer has a current PTIN (required)", !!x.ptinConfirmed)}
        ${cb("finEfile", "Owner confirmed they're an Authorized IRS e-file Provider (has an EFIN)", !!x.efileProvider)}
        ${inp("finOffSeason", "Hours after tax season", x.offSeason, "After April 15, Monday to Thursday 9 to 4, or by appointment")}
        <h3>Tax season hours</h3>
        <p class="small muted">Google's hours stay the regular set. Inside this window the site shows these first with a “Tax season hours” chip; outside it they move under the regular hours. The open/closed pill still follows Google's hours.</p>
        <div class="row">${inp("finSeasonFrom", "From (MM-DD)", sh.from, "01-15")}${inp("finSeasonTo", "To (MM-DD)", sh.to, "04-15")}</div>
        ${inp("finSeasonSummary", "Season hours (their words)", sh.summary, "Monday to Friday 8 to 7, Saturday 9 to 3")}
        ${ta("finBring", "What to bring (one per line; leave blank for the standard list)", (x.whatToBring || []).join("\n"), 5)}` : ""}
      ${v === "tax_prep" || v === "accounting" ? `${cb("finCpa", "Owner confirmed an Alabama CPA firm permit (required if “CPA” appears anywhere)", !!x.cpaPermitConfirmed)}${inp("finCpaNo", "Firm permit # (optional, shown in the footer)", x.cpaPermitNo)}` : ""}
      ${v === "insurance" ? `${cb("finIndependent", "Independent agency (works with several companies)", !!x.independent)}
        ${ta("finCarriers", "Companies they're appointed with, one per line: <code>Name | pay-a-bill link | claims phone | claims link</code> <span class=\"hint\">A name alone is fine; links add a “Pay a bill / Report a claim” list.</span>", carrierLines(x.carriers), 5, "Progressive | https://account.progressive.com | 800-776-4737 | https://www.progressive.com/claims/\nAuto-Owners")}
        <label class="field">Memberships (comma separated; text chips only, no logos)<input name="finMemberships" value="${esc((x.memberships || []).join(", "))}" placeholder="Trusted Choice, Big “I”"></label>
        ${cb("finLicenses", "Owner confirmed the agents shown are licensed in Alabama for these lines (required)", !!x.licensesConfirmed)}
        ${inp("finLicenseNo", "License # or NPN (optional, shown in the footer)", x.licenseNo)}
        ${cb("finMedicare", "They sell Medicare Advantage or Part D plans", !!x.medicare)}
        ${ta("finTpmo", "Medicare disclaimer (required if they sell Medicare plans) <span class=\"hint\">Paste the current (October 2026) CMS wording from their carrier or FMO; the SHIP reference was removed, so an older paste is out of date.</span>", x.tpmoDisclaimer, 4)}` : ""}
      ${v === "financial_advisor" ? `<p class="small"><strong>Ask first:</strong> does their firm let them use their own website? Most need compliance approval.</p>
        ${ta("finDisclosure", "Firm disclosure text (required, word for word)", x.disclosure, 5, "Securities offered through …, Member FINRA/SIPC. Advisory services offered through …")}
        <div class="row">${inp("finApprovedBy", "Compliance approved by (required)", x.complianceApprovedBy)}${inp("finApprovedOn", "Approval date", x.complianceApprovedOn, "", "date")}</div>
        ${inp("finBrokercheck", "BrokerCheck link", x.brokercheckUrl, "https://brokercheck.finra.org/…", "url")}
        ${inp("finCrs", "Form CRS link", x.crsUrl, "https://", "url")}
        <p class="small muted">Advisor sites show no reviews, ratings or testimonials by default. Alabama dropped its testimonial ban in Dec 2025, so if the firm's compliance department approves it in writing, fill in who and when and the site adds a reviews section with the SEC disclosure line under it.</p>
        <div class="row">${inp("finRevBy", "Reviews approved by (compliance)", ara.by)}${inp("finRevOn", "Approval date", ara.on, "", "date")}</div>` : ""}
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
      independent: on("finIndependent"), carriers: f.elements.finCarriers ? parseCarrierLines(f.elements.finCarriers.value) : undefined, licensesConfirmed: on("finLicenses"), licenseNo: v("finLicenseNo"), medicare: on("finMedicare"), tpmoDisclaimer: v("finTpmo"),
      disclosure: f.elements.finDisclosure ? f.elements.finDisclosure.value.trim() : undefined, complianceApprovedBy: v("finApprovedBy"), complianceApprovedOn: v("finApprovedOn"), brokercheckUrl: v("finBrokercheck"), crsUrl: v("finCrs"),
      spanish: on("finSpanish"), modes: [["finDrop", "drop_off"], ["finInPerson", "in_person"], ["finVirtual", "virtual"]].filter(([n]) => on(n)).map(([, m]) => m),
      portalUrl: v("finPortal"),
      people: f.elements.finPeople ? f.elements.finPeople.value.split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((p) => p[0]).map((p) => ({ name: p[0], title: p[1] || "", credentials: p[2] || undefined, line: p.slice(3).join(" | ") || undefined })) : undefined,
      peopleConfirmed: on("finPeopleOk"), whoWeServe: v("finWhoWeServe"),
      fees: f.elements.finFees ? f.elements.finFees.value.split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((p) => p[0] && p[1]).map((p) => ({ service: p[0], price: p[1] })) : undefined,
      feesAsOf: v("finFeesAsOf"),
      seasonHours: f.elements.finSeasonSummary ? (v("finSeasonFrom") && v("finSeasonTo") && v("finSeasonSummary") ? { from: v("finSeasonFrom"), to: v("finSeasonTo"), summary: v("finSeasonSummary") } : null) : undefined,
      memberships: f.elements.finMemberships ? v("finMemberships").split(",").map((x) => x.trim()).filter(Boolean) : undefined,
      advisorReviewsApproved: f.elements.finRevBy ? (v("finRevBy") && v("finRevOn") ? { by: v("finRevBy"), on: v("finRevOn") } : null) : undefined,
    };
    return Object.fromEntries(Object.entries(out).filter(([, x]) => x !== undefined));
  }

  /* ---------- Oct 2026 (research/trends-2026): owner proof, visit lines, restaurant / salon / retail / print details ---------- */
  const MENU_TAGS = [["popular", "Popular"], ["new", "New"], ["vegetarian", "Vegetarian"], ["vegan", "Vegan"], ["gluten_free", "Gluten-free"], ["spicy", "Spicy"]];
  const fsLines = (f, n) => (f.elements[n] ? f.elements[n].value.split("\n").map((x) => x.trim()).filter(Boolean) : undefined);
  const fsVal = (f, n) => (f.elements[n] ? f.elements[n].value.trim() : undefined);
  const fsOn = (f, n) => (f.elements[n] ? f.elements[n].checked : undefined);
  const fsPipe = (line) => line.split("|").map((x) => x.trim());
  const fsClean = (o) => Object.fromEntries(Object.entries(o).filter(([, x]) => x !== undefined));

  function proofEditCard(r) {
    const p = r.proof || {};
    return `<section class="card"><h2>Awards &amp; proof</h2>
      <p class="small muted">Only what the owner can back up. Awards and memberships show in the opening; named clients show as “Trusted by” (ask permission first).</p>
      <label class="field">Awards (one per line: <code>Award | Year</code>)<textarea name="prAwards" rows="3" placeholder="Best of the Best, Cullman Times | 2025">${esc((p.awards || []).map((a) => [a.name, a.year || ""].join(" | ").replace(/ \| $/, "")).join("\n"))}</textarea></label>
      <label class="field">Memberships (one per line)<textarea name="prMemberships" rows="2" placeholder="Cullman Area Chamber of Commerce">${esc((p.memberships || []).join("\n"))}</textarea></label>
      <label class="field">Clients we can name (one per line)<textarea name="prClients" rows="2" placeholder="Cullman City Schools&#10;Wallace State">${esc((p.clients || []).join("\n"))}</textarea></label>
      <label class="field">Numbers (one per line: <code>Value | Label</code>)<textarea name="prStats" rows="2" placeholder="40 | vendor booths&#10;20,000 | square feet">${esc((p.stats || []).map((x) => `${x.value} | ${x.label}`).join("\n"))}</textarea></label>
    </section>`;
  }
  function proofEditValues(f) {
    const awards = (fsLines(f, "prAwards") || []).map((l) => { const [name, year] = fsPipe(l); return name ? { name: name.slice(0, 80), year: (year || "").slice(0, 12) || undefined } : null; }).filter(Boolean);
    const stats = (fsLines(f, "prStats") || []).map((l) => { const [value, label] = fsPipe(l); return value && label ? { value: value.slice(0, 20), label: label.slice(0, 60) } : null; }).filter(Boolean);
    return { awards: awards.slice(0, 12), memberships: (fsLines(f, "prMemberships") || []).slice(0, 12), clients: (fsLines(f, "prClients") || []).slice(0, 20), stats: stats.slice(0, 6) };
  }

  function visitEditCard(r) {
    const v = r.visit || {};
    return `<section class="card"><h2>Closures, parking &amp; payment</h2>
      <p class="small muted">Holiday closures show under the hours and in the top strip the week before, then drop off on their own.</p>
      <label class="field">Closures (one per line: <code>YYYY-MM-DD | Why</code>)<textarea name="vsClosures" rows="3" placeholder="2026-11-26 | Thanksgiving&#10;2026-12-25 | Christmas">${esc((r.closures || []).map((c) => `${c.date} | ${c.label}`).join("\n"))}</textarea></label>
      <label class="field">Ways to pay (comma separated)<input name="vsPay" value="${esc((v.paymentMethods || []).join(", "))}" placeholder="Cash, Visa, Mastercard, Venmo"></label>
      <label class="field">Parking<input name="vsParking" maxlength="240" value="${esc(v.parking || "")}" placeholder="Free lot behind the building; enter from 2nd Ave."></label>
    </section>`;
  }
  function visitEditValues(f) {
    const closures = (fsLines(f, "vsClosures") || []).map((l) => { const [date, label] = fsPipe(l); return /^\d{4}-\d{2}-\d{2}$/.test(date || "") && label ? { date, label: label.slice(0, 80) } : null; }).filter(Boolean).slice(0, 20);
    const pay = (fsVal(f, "vsPay") || "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 10);
    return { closures, visit: { paymentMethods: pay, parking: fsVal(f, "vsParking") || "" } };
  }

  /** Per-item photo (from the gallery) and tags; items come from the saved menu, so type the menu first. */
  function menuItemsEditHtml(id, r) {
    const items = ((((r.ext || {}).restaurant || {}).menu || {}).sections || []).flatMap((s) => s.items).slice(0, 60);
    const photos = (r.media.gallery || []).filter((g) => g.source !== "google");
    if (!items.length) return `<p class="small muted">Save the menu first, then come back to add dish photos and tags.</p>`;
    const opt = (it) => photos.map((g, i) => `<option value="${esc(g.src)}"${it.image && it.image.src === g.src ? " selected" : ""}>Photo ${i + 1}: ${esc(g.alt)}</option>`).join("");
    return `<details class="more"><summary>Dish photos &amp; tags (${items.length} items)</summary>
      <p class="small muted">${photos.length ? "Pick a gallery photo for 3 or 4 best sellers and tag them Popular: they become photo tiles on the home page." : "Add the owner's dish photos in Photo gallery first, then pick one per item here. Tags show on the menu."}</p>
      ${items.map((it, i) => `<div class="row" style="align-items:flex-start;margin-bottom:8px"><div style="flex:1 1 180px"><b>${esc(it.name)}</b><input type="hidden" name="mi_name_${i}" value="${esc(it.name)}">
        ${photos.length ? `<select name="mi_img_${i}"><option value="">No photo</option>${opt(it)}</select>` : ""}</div>
        <div style="flex:1 1 200px">${MENU_TAGS.map(([t, label]) => `<label class="check" style="display:inline-block;margin-right:8px"><input type="checkbox" name="mi_tag_${i}_${t}"${(it.tags || []).includes(t) ? " checked" : ""}> ${label}</label>`).join("")}</div></div>`).join("")}
    </details>`;
  }
  function menuItemsEditValues(f) {
    const out = [];
    for (let i = 0; i < 60; i++) {
      const name = fsVal(f, `mi_name_${i}`);
      if (!name) break;
      const tags = MENU_TAGS.map(([t]) => t).filter((t) => fsOn(f, `mi_tag_${i}_${t}`));
      const img = fsVal(f, `mi_img_${i}`);
      out.push({ name, image: img === undefined ? undefined : img, tags });
    }
    return out;
  }

  function restaurantEditCard(r, x, cb) {
    const truck = r.variant === "food_truck";
    const d = x.deliveryLinks || {};
    return `<section class="card"><h2>Restaurant details</h2>
      ${cb("rsCatering", "They cater (adds a Catering section and request form)", !!x.catering)}
      <label class="field">What they cater (their words)<input name="rsCateringNote" maxlength="300" value="${esc(x.cateringNote || "")}" placeholder="Pans and plates for 20 to 200: church suppers, reunions, work lunches."></label>
      ${truck ? `<label class="field">Schedule link (Google Calendar or Facebook events) <span class="hint">This week's stops go in Events &amp; specials as <code>date | Place | time</code></span><input name="rsCalendar" type="url" value="${esc(x.calendarUrl || "")}" placeholder="https://"></label>` : ""}
      <h3>Order through (their own pages)</h3>
      <div class="row"><label class="field">DoorDash<input name="rsDoordash" type="url" value="${esc(d.doordash || "")}" placeholder="https://"></label>
      <label class="field">Uber Eats<input name="rsUbereats" type="url" value="${esc(d.ubereats || "")}" placeholder="https://"></label>
      <label class="field">Grubhub<input name="rsGrubhub" type="url" value="${esc(d.grubhub || "")}" placeholder="https://"></label></div>
      <label class="field">Rewards / loyalty sign-up link<input name="rsRewards" type="url" value="${esc(x.rewardsUrl || "")}" placeholder="https://"></label>
      <p class="small muted">With a reservations link (Links card), Reserve a table becomes the main button for dine-in places. Gift cards: paste the link in the Links card.</p>
    </section>`;
  }
  function restaurantEditValues(f) {
    return fsClean({
      catering: fsOn(f, "rsCatering"), cateringNote: fsVal(f, "rsCateringNote"), calendarUrl: fsVal(f, "rsCalendar"), rewardsUrl: fsVal(f, "rsRewards"),
      deliveryLinks: { doordash: fsVal(f, "rsDoordash") || "", ubereats: fsVal(f, "rsUbereats") || "", grubhub: fsVal(f, "rsGrubhub") || "" },
    });
  }

  function salonEditCard(r, x, cb) {
    const massage = r.variant === "massage";
    const pet = r.variant === "pet";
    const pol = x.policies || {};
    const io = x.introOffer || {};
    const pt = x.pet || {};
    const teamLines = (x.team || []).map((m) => [m.name, m.role || "", m.days || "", m.bookingUrl || "", m.line || ""].join(" | ").replace(/( \|\s*)+$/, "")).join("\n");
    return `<section class="card"><h2>${pet ? "Grooming details" : massage ? "Massage details" : "Salon details"}</h2>
      <p class="small muted">People book people. One person per line: <code>Name | Role | Days | Booking link | One line about them</code>. Required to confirm before the site goes live.</p>
      <label class="field">Team<textarea name="slTeam" rows="4" placeholder="Jess Carter | Owner, stylist | Tue–Sat | https://booksy.com/… | Color and balayage">${esc(teamLines)}</textarea></label>
      ${cb("slTeamOk", "Owner confirmed the team list (required once a team is listed)", !!x.teamConfirmed)}
      ${massage ? `<label class="field">Session rates (one per line: <code>Minutes | Price</code>)<textarea name="slRates" rows="3" placeholder="30 | $45&#10;60 | $80&#10;90 | $115">${esc((x.rates || []).map((t) => `${t.minutes} | ${t.price}`).join("\n"))}</textarea></label>` : ""}
      <h3>Good to know (their wording)</h3>
      <label class="field">Deposits<input name="slDeposit" maxlength="300" value="${esc(pol.deposit || "")}" placeholder="A $20 deposit holds color appointments."></label>
      <label class="field">Cancellations<input name="slCancel" maxlength="300" value="${esc(pol.cancellation || "")}" placeholder="Please give us 24 hours' notice."></label>
      <label class="field">Running late<input name="slLate" maxlength="300" value="${esc(pol.lateness || "")}" placeholder="15 minutes late may mean a shorter service."></label>
      <label class="field">Kids<input name="slKids" maxlength="300" value="${esc(pol.kids || "")}" placeholder="Kids are welcome for their own appointments."></label>
      <h3>New-client offer</h3>
      <div class="row"><label class="field">Offer<input name="slOffer" maxlength="120" value="${esc(io.text || "")}" placeholder="$10 off your first cut"></label>
      <label class="field">Ends on<input name="slOfferUntil" type="date" value="${esc(io.until || "")}"></label></div>
      ${pet ? `<h3>Before your appointment</h3>
      <label class="field">Vaccinations they require<input name="slVax" maxlength="300" value="${esc(pt.vaccinations || "")}" placeholder="Proof of current rabies and DHPP, please."></label>
      <label class="field">Pricing line<input name="slPricing" maxlength="300" value="${esc(pt.pricingFrom || "")}" placeholder="Full grooms start at $45 for small dogs; price depends on size and coat."></label>
      <label class="field">Matting / de-shedding note<input name="slMatting" maxlength="300" value="${esc(pt.mattingNote || "")}" placeholder="Heavy matting may mean a shorter cut and an extra charge."></label>
      <label class="field">What to bring / prep<input name="slPrep" maxlength="300" value="${esc(pt.prep || "")}" placeholder="A potty break before you arrive, and their vaccine record the first time."></label>` : ""}
    </section>`;
  }
  function salonEditValues(f, r) {
    const team = (fsLines(f, "slTeam") || []).map((l) => { const [name, role, days, bookingUrl, line] = fsPipe(l); return name ? fsClean({ name: name.slice(0, 60), role: role || undefined, days: days || undefined, bookingUrl: bookingUrl && /^https?:\/\//.test(bookingUrl) ? bookingUrl : undefined, line: line || undefined }) : null; }).filter(Boolean).slice(0, 20);
    const out = {
      team, teamConfirmed: fsOn(f, "slTeamOk"),
      policies: { deposit: fsVal(f, "slDeposit") || "", cancellation: fsVal(f, "slCancel") || "", lateness: fsVal(f, "slLate") || "", kids: fsVal(f, "slKids") || "" },
      introOffer: { text: fsVal(f, "slOffer") || "", until: fsVal(f, "slOfferUntil") || "" },
    };
    if (r.variant === "massage") out.rates = (fsLines(f, "slRates") || []).map((l) => { const [m, price] = fsPipe(l); const minutes = Number((m || "").replace(/\D/g, "")); return minutes && price ? { minutes, price: price.slice(0, 20) } : null; }).filter(Boolean).slice(0, 10);
    if (r.variant === "pet") out.pet = { vaccinations: fsVal(f, "slVax") || "", pricingFrom: fsVal(f, "slPricing") || "", mattingNote: fsVal(f, "slMatting") || "", prep: fsVal(f, "slPrep") || "" };
    return fsClean(out);
  }

  const PRICE_KINDS = [["", "Guess from the business"], ["fish", "Fish & aquarium"], ["plants", "Plants & nursery"], ["pets", "Pets & reptiles"], ["food", "Food & baked goods"], ["parts", "Auto parts & tires"], ["vehicles", "Vehicles & equipment"], ["goods", "Other goods"]];
  /** The live price list for any business other than a shop (shops have it inside Shop details). */
  /** Mirrors scanningOn() in the generator: on when switched on, or (older shops) when any barcode is already stored. */
  function scanningOnPl(pl) {
    if (pl.scanning !== undefined && pl.scanning !== null) return !!pl.scanning;
    return (pl.sections || []).some((s) => (s.items || []).some((it) => it.barcode)) || (pl.catalog || []).some((c) => c.barcode);
  }
  function priceListEditCard(r) {
    const pl = (r.ext.retail && r.ext.retail.priceList) || {};
    return `<section class="card"><h2>Live price list & QR labels</h2>
      <p class="small muted">Optional. A page with a section per case, shelf, bench or bin that the owner keeps current from their phone or a tablet; each section gets a QR label. A long list (a spreadsheet, a register export)? Open their board from the lead page ("Open it here") and use "Put a whole list on at once".</p>
      <label class="field">Price list <span class="hint">One item per line: Name | $Price | Note. Start a section with # Section name.</span><textarea name="plText" rows="6" placeholder="# Case&#10;Sourdough loaf | $8 | Baked daily&#10;Cinnamon rolls (6) | $14&#10;&#10;# Shelf&#10;Local honey, 16 oz | $12">${esc(pl.sections ? priceListText(pl.sections) : "")}</textarea></label>
      <div class="row"><label class="field">Page title<input name="plTitle" maxlength="40" value="${esc(pl.title || "")}" placeholder="Today's prices"></label>
      <label class="field">What's on it<select name="plKind">${PRICE_KINDS.map(([k, t]) => `<option value="${k}"${pl.kind === k ? " selected" : ""}>${t}</option>`).join("")}</select></label></div>
      <label class="check"><input type="checkbox" name="plPublic"${pl.public !== false ? " checked" : ""}> Show the price list to Google and in the site menu (off = only reachable from the QR labels)</label>
      <label class="check"><input type="checkbox" name="plScan"${scanningOnPl(pl) ? " checked" : ""}> Barcode scanning on (the Barcode scanning add-on): a Scan button on their board and in the tablet's staff mode</label></section>`;
  }
  function priceListEditValues(f) {
    if (!f.elements.plText) return undefined;
    const kind = fsVal(f, "plKind");
    return { text: fsVal(f, "plText") || "", title: fsVal(f, "plTitle") || "", public: !!fsOn(f, "plPublic"), scanning: !!fsOn(f, "plScan"), ...(kind ? { kind } : {}) };
  }

  function retailEditCard(r, x, cb) {
    const v = r.variant;
    const fl = x.florist || {};
    const vd = x.vendors || {};
    const fin = x.financing || {};
    const booths = v === "antique" || v === "thrift" || v === "boutique" || v === "gift";
    const stock = v === "farm_feed" || v === "hardware" || v === "furniture" || v === "pet";
    return `<section class="card"><h2>Shop details</h2>
      ${v === "florist" ? `<h3>Florist</h3>
      <label class="field">Occasions (one per line; leave empty for the usual four)<textarea name="rtOccasions" rows="3" placeholder="Sympathy &amp; funeral&#10;Weddings &amp; events&#10;Birthdays &amp; anniversaries&#10;Just because">${esc((fl.occasions || []).join("\n"))}</textarea></label>
      <div class="row"><label class="field">Delivery area<input name="rtArea" maxlength="120" value="${esc(fl.deliveryArea || "")}" placeholder="Cullman and Hanceville"></label>
      <label class="field">Same-day cutoff<input name="rtCutoff" maxlength="40" value="${esc(fl.cutoff || "")}" placeholder="1 PM"></label>
      <label class="field">Delivery fee<input name="rtFee" maxlength="60" value="${esc(fl.deliveryFee || "")}" placeholder="$10 in town"></label></div>
      ${cb("rtDesigners", "Offer designer's choice (we pick what's freshest)", !!fl.designersChoice)}
      <p class="small muted">The site only says “same-day” once a cutoff time is typed here.</p>` : ""}
      ${booths ? `<h3>Vendors &amp; booths</h3>
      ${cb("rtBooths", "Booths available (adds a booth inquiry form)", !!vd.boothsAvailable)}
      <label class="field">Vendor note (their words)<input name="rtVendorNote" maxlength="400" value="${esc(vd.note || "")}" placeholder="Booths from 8x10; month-to-month. Ask about rates."></label>` : ""}
      ${stock ? `<h3>Departments &amp; brands</h3>
      <label class="field">Departments (one per line)<textarea name="rtDepartments" rows="3" placeholder="Cattle &amp; horse&#10;Poultry&#10;Pets&#10;Lawn &amp; garden">${esc((x.departments || []).join("\n"))}</textarea></label>
      <label class="field">Brands they carry (one per line, names only)<textarea name="rtBrands" rows="3" placeholder="Purina&#10;Nutrena&#10;Stihl">${esc((x.brands || []).join("\n"))}</textarea></label>` : ""}
      ${v === "furniture" || v === "farm_feed" || v === "hardware" ? `<h3>Delivery &amp; financing</h3>
      <label class="field">Delivery rule (their words)<input name="rtDeliveryNote" maxlength="240" value="${esc(x.deliveryNote || "")}" placeholder="Free delivery in Cullman County on orders over $499."></label>
      <div class="row"><label class="field">Financing partner<input name="rtLender" maxlength="60" value="${esc(fin.lender || "")}" placeholder="Synchrony, Acima…"></label>
      <label class="field">Apply link<input name="rtLenderUrl" type="url" value="${esc(fin.url || "")}" placeholder="https://"></label></div>` : ""}
      ${v === "boutique" || v === "gift" ? `<h3>New arrivals</h3>
      <label class="field">Drop day<input name="rtDropDay" maxlength="120" value="${esc(x.dropDay || "")}" placeholder="New arrivals every Thursday at 10, in store and on Facebook Live."></label>
      <label class="field">Occasions (one per line)<textarea name="rtOcc2" rows="3" placeholder="Homecoming&#10;Game day&#10;Prom&#10;Baby showers">${esc((x.occasions || []).join("\n"))}</textarea></label>` : ""}
      ${booths || v === "furniture" ? `<label class="field">Hold line<input name="rtHold" maxlength="160" value="${esc(x.holdNote || "")}" placeholder="Call to hold an item for 24 hours."></label>` : ""}
      <h3>Price list &amp; QR labels</h3>
      <label class="field">Price list <span class="hint">One item per line: Name | $Price | Note. Start a section with # Section name (one per tank, shelf or rack). A long list pastes in from a spreadsheet on their board ("Open it here" on the lead page → "Put a whole list on at once").</span><textarea name="rtPriceList" rows="8" placeholder="# Freshwater community&#10;Neon tetra | $2.99 | Schooling fish, keep 6+&#10;Corydoras | $6.99&#10;&#10;# Saltwater&#10;Ocellaris clownfish | $24.99">${esc(x.priceList && x.priceList.sections ? priceListText(x.priceList.sections) : "")}</textarea></label>
      <div class="row"><label class="field">Page title<input name="rtPriceTitle" maxlength="40" value="${esc((x.priceList && x.priceList.title) || "")}" placeholder="Fish & prices"></label>
      <label class="field">What's on it<select name="rtPriceKind">${PRICE_KINDS.map(([k, t]) => `<option value="${k}"${(x.priceList && x.priceList.kind) === k ? " selected" : ""}>${t}</option>`).join("")}</select></label></div>
      ${cb("rtPricesPublic", "Show the price list to Google and in the site menu (off = only reachable from the QR labels)", !x.priceList || x.priceList.public !== false)}
      ${cb("rtPriceScan", "Barcode scanning on (the Barcode scanning add-on): a Scan button on their board and in the tablet's staff mode", scanningOnPl(x.priceList || {}))}
      <p class="small muted">Each section gets a QR label on the printable sheet (Live lead → QR price tags). A price change here is a price change on the shelf.</p>
      ${priceItemsEditHtml(r, x)}
    </section>`;
  }
  function priceItemsEditHtml(r, x) {
    const items = (((x.priceList || {}).sections) || []).flatMap((s) => s.items).slice(0, 120);
    const photos = (r.media.gallery || []).filter((g) => g.source !== "google");
    if (!items.length || !photos.length) return "";
    const opt = (it) => photos.map((g, i) => `<option value="${esc(g.src)}"${it.image && it.image.src === g.src ? " selected" : ""}>Photo ${i + 1}: ${esc(g.alt)}</option>`).join("");
    return `<details class="more"><summary>Item photos (${items.length} items)</summary>
      <p class="small muted">A gallery photo per item shows on the price list next to the price. Photos whose caption names the item are picked automatically; change any here.</p>
      ${items.map((it, i) => `<label class="field" style="margin-bottom:6px">${esc(it.name)}<input type="hidden" name="pi_name_${i}" value="${esc(it.name)}"><select name="pi_img_${i}"><option value="">No photo</option>${opt(it)}</select></label>`).join("")}
    </details>`;
  }
  function priceItemsEditValues(f) {
    const out = [];
    for (let i = 0; i < 120; i++) {
      const name = fsVal(f, `pi_name_${i}`);
      if (!name) break;
      out.push({ name, image: fsVal(f, `pi_img_${i}`) || "" });
    }
    return out;
  }
  function priceListText(sections) {
    return sections.map((s) => ["# " + s.name].concat(s.items.map((i) => [i.name, i.price || "", i.description || ""].join(" | ").replace(/( \| )+$/, ""))).join("\n")).join("\n\n");
  }
  function retailEditValues(f, r) {
    const v = r.variant;
    const out = {};
    if (v === "florist") out.florist = { occasions: fsLines(f, "rtOccasions") || [], deliveryArea: fsVal(f, "rtArea") || "", cutoff: fsVal(f, "rtCutoff") || "", deliveryFee: fsVal(f, "rtFee") || "", designersChoice: !!fsOn(f, "rtDesigners") };
    if (f.elements.rtBooths) out.vendors = { boothsAvailable: !!fsOn(f, "rtBooths"), note: fsVal(f, "rtVendorNote") || "" };
    if (f.elements.rtDepartments) { out.departments = fsLines(f, "rtDepartments"); out.brands = fsLines(f, "rtBrands"); }
    if (f.elements.rtDeliveryNote) { out.deliveryNote = fsVal(f, "rtDeliveryNote"); out.financing = { lender: fsVal(f, "rtLender") || "", url: fsVal(f, "rtLenderUrl") || "" }; }
    if (f.elements.rtDropDay) { out.dropDay = fsVal(f, "rtDropDay"); out.occasions = fsLines(f, "rtOcc2"); }
    if (f.elements.rtHold) out.holdNote = fsVal(f, "rtHold");
    if (f.elements.rtPriceList) { out.priceListText = fsVal(f, "rtPriceList") || ""; out.priceListTitle = fsVal(f, "rtPriceTitle") || ""; out.pricesPublic = !!fsOn(f, "rtPricesPublic"); if (fsVal(f, "rtPriceKind")) out.priceKind = fsVal(f, "rtPriceKind"); out.priceScanning = !!fsOn(f, "rtPriceScan"); }
    const pi = priceItemsEditValues(f);
    if (pi.length) out.priceItems = pi;
    return fsClean(out);
  }

  function printEditCard(r, x) {
    return `<section class="card"><h2>Print shop details</h2>
      <label class="field">Artwork upload link <span class="hint">A Dropbox or Google Drive “file request” link: customers upload, files land in their folder</span><input name="ptUpload" type="url" value="${esc(x.uploadUrl || "")}" placeholder="https://www.dropbox.com/request/…"></label>
      <label class="field">Typical turnaround (their words)<input name="ptTurnaround" maxlength="160" value="${esc(x.turnaround || "")}" placeholder="About 10 business days after you approve the proof."></label>
      <label class="field">Price breaks at (quantities, comma separated)<input name="ptTiers" value="${esc((x.quantityTiers || []).map((t) => (t.note ? `${t.from} ${t.note}` : String(t.from))).join(", "))}" placeholder="12, 24, 48, 72"></label>
      <label class="field">Online / team store link<input name="ptStore" type="url" value="${esc(x.storeUrl || "")}" placeholder="https://"></label>
      <p class="small muted">The quote form asks what, how many, needed-by date, print locations, artwork status and rush. The text never states turnaround or minimums unless typed here.</p>
    </section>`;
  }
  function printEditValues(f) {
    const tiers = (fsVal(f, "ptTiers") || "").split(",").map((x) => x.trim()).filter(Boolean).map((x) => { const m = /^(\d+)\+?\s*(.*)$/.exec(x); return m ? { from: Number(m[1]), note: (m[2] || "").slice(0, 40) || undefined } : null; }).filter((t) => t && t.from > 0).slice(0, 8);
    return fsClean({ uploadUrl: fsVal(f, "ptUpload"), turnaround: fsVal(f, "ptTurnaround"), quantityTiers: tiers, storeUrl: fsVal(f, "ptStore") });
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
      : l.presence === "elsewhere" ? `I looked ${biz} up on Google and there's no website on your listing; the only page I found is on ${foundHost(l)}, so it isn't really yours`
      : l.presence === "outdated" || l.presence === "free_builder" ? `I pulled up your website on my phone and it was hard to use`
      : `I noticed ${biz} doesn't have a website`;
    const mid = plans.find((p) => p.id === "plus") || plans[Math.floor(plans.length / 2)] || plans[0];
    const cheapest = plans.reduce((a, p) => (p.id !== "list" && p.monthly && (!a || p.monthly < a.monthly) ? p : a), null);
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
        <p><a class="btn" href="${l ? `#/plans/${id}` : "#/plans"}">📋 Show them the plans</a> <a class="btn btn--small" href="/api/contract${l ? `?lead=${id}` : ""}" target="_blank" rel="noopener">📄 Show them the agreement</a> <a class="btn btn--small" href="#/playbook">💬 Plans & answers</a></p>`)}

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
        ${l && l.salesStatus !== "live" ? shareButtonsHtml(l) : ""}`)}

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
    ["listing_gbp_site", "Google Business Profile: website field points at the live site, and the booking/menu links too", "https://business.google.com/"],
    ["listing_gsc", "Google Search Console: site verified under our account (Edit → Links → Search Console code), sitemap.xml submitted", "https://search.google.com/search-console"],
    ["listing_apple", "Apple Maps (Apple Business Connect)", "https://businessconnect.apple.com/"],
    ["listing_bing", "Bing Places (import from Google Business Profile, turn on sync)", "https://www.bingplaces.com/"],
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

  // Edit → "Their current website" → Not their website (owner): undo the import and rebuild.
  document.addEventListener("click", async (e) => {
    const b = e.target.closest && e.target.closest("[data-forgetsite]");
    if (!b) return;
    const m = /#\/edit\/([a-z0-9]+)/.exec(location.hash);
    if (!m) return;
    if (!confirm("Remove the text and photos taken from that page, forget the page, and rewrite the site? The Google photo comes back as the main photo.")) return;
    b.disabled = true;
    try { await api(`/leads/${m[1]}/siteimport`, { method: "DELETE" }); toast("Removed. Rebuilding with fresh text…"); setTimeout(() => viewLead(m[1]), 1500); }
    catch (err) { toast(err.message); b.disabled = false; }
  });

  function bindReviewAsk(l) {
    $app.querySelectorAll("[data-lookuplink]").forEach((lb) => lb.addEventListener("click", async () => {
      const open = lb.dataset.lookuplink === "open";
      const win = open ? window.open("", "_blank") : null;
      lb.disabled = true;
      try {
        const { url, text } = await api(`/leads/${l.id}/lookuplink`, { method: "POST" });
        if (win) win.location.href = url; else location.href = `sms:+1${phoneDigits(l)}?body=${encodeURIComponent(text)}`;
      } catch (err) { if (win) win.close(); toast(err.message); } finally { lb.disabled = false; }
    }));
    $app.querySelectorAll("[data-clientlink]").forEach((cb) => cb.addEventListener("click", async () => {
      cb.disabled = true;
      try {
        const { url, text } = await api(`/leads/${l.id}/clientlink`, { method: "POST" });
        if (cb.dataset.clientlink === "open") window.open(url, "_blank", "noopener");
        else location.href = `sms:+1${phoneDigits(l)}?body=${encodeURIComponent(text)}`;
      } catch (err) { toast(err.message); } finally { cb.disabled = false; }
    }));
    const tpl = $app.querySelector("[data-textpitch-lead]");
    if (tpl) tpl.addEventListener("click", async () => {
      tpl.disabled = true;
      try { const { text } = await api(`/leads/${l.id}/boardlink`, { method: "POST" }); location.href = `sms:+1${phoneDigits(l)}?body=${encodeURIComponent(text)}`; }
      catch (err) { toast(err.message); } finally { tpl.disabled = false; }
    });
    const rv = $app.querySelector("[data-clientrevoke]");
    if (rv) rv.addEventListener("click", async () => {
      if (!confirm("Stop every board link sent so far? You'll text them a new one.")) return;
      rv.disabled = true;
      try { await api(`/leads/${l.id}/clientlink`, { method: "DELETE" }); toast("Old links no longer work. Text them a new one."); } catch (err) { toast(err.message); } finally { rv.disabled = false; }
    });
    const pr = $app.querySelector("[data-practice-reset]");
    if (pr) pr.addEventListener("click", async () => {
      if (!confirm("Reset the practice lead? This refunds any $1 payments, removes every sign-up, note and task on it, takes down anything published, and puts fresh sample items back.")) return;
      pr.disabled = true; pr.textContent = "Resetting…";
      try { const r = await api(`/leads/${l.id}/practice/reset`, { method: "POST" }); toast(`Reset. ${r.refunded ? `Refunded ${r.refunded} payment${r.refunded === 1 ? "" : "s"}. ` : ""}${r.signups} sign-up${r.signups === 1 ? "" : "s"} and ${r.notes} note${r.notes === 1 ? "" : "s"} cleared${r.pagesDeleted ? ", site taken down" : ""}.`); setTimeout(() => render(), 600); } catch (err) { toast(err.message); pr.disabled = false; pr.textContent = "🔁 Reset for the next run"; }
    });
    const ss = $app.querySelector("[data-samplestock]");
    if (ss) ss.addEventListener("click", async () => {
      const add = ss.dataset.samplestock === "add";
      if (!add && !confirm("Remove every sample item from the price list? Anything they typed themselves stays.")) return;
      ss.disabled = true;
      try { const r = await api(`/leads/${l.id}/samplestock`, { method: add ? "POST" : "DELETE" }); toast(add ? `${r.items} sample items added. The preview is rebuilding.` : "Sample items removed. The preview is rebuilding."); setTimeout(() => render(), 400); } catch (err) { toast(err.message); ss.disabled = false; }
    });
    const gaNow = $app.querySelector("[data-ga-now]");
    if (gaNow) gaNow.addEventListener("click", async () => {
      gaNow.disabled = true; gaNow.textContent = "Setting up… (about 20 seconds)";
      try { const r = await api(`/leads/${l.id}/analytics`, { method: "POST" }); toast(`Google Analytics is on the live site (${r.analytics.id}).`); setTimeout(() => render(), 300); }
      catch (err) { toast(err.message); gaNow.disabled = false; gaNow.textContent = "Set it up now"; }
    });
    const gaAccess = $app.querySelector("[data-ga-access]");
    if (gaAccess) gaAccess.addEventListener("click", async () => {
      const email = (prompt("The owner's Google address (Gmail or Google Workspace). They'll be able to see their own reports:", "") || "").trim();
      if (!email) return;
      gaAccess.disabled = true;
      try { await api(`/leads/${l.id}/analytics/access`, { method: "POST", json: { email } }); toast(`Done. ${email} can open analytics.google.com and see ${l.record ? l.record.name : l.name}.`); }
      catch (err) { toast(err.message); } finally { gaAccess.disabled = false; }
    });
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
      $app.querySelectorAll("[data-copytext]").forEach((b) => b.dataset.bound = "1");
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
  const PACKS = [["restaurant", "Restaurant, cafe, bakery or food truck"], ["contractor", "Contractor or home service (plumbing, HVAC, painting, concrete, tree, pest…)"], ["salon", "Salon, barber, nails, massage or pet grooming"], ["auto", "Auto repair, body shop, detailing, towing or small engine"], ["landscaping", "Landscaping or lawn care"], ["cleaning", "Cleaning or pressure washing"], ["finance", "Tax preparer, accountant, insurance agency or financial advisor"], ["church", "Church, VFW/Legion/Lions/lodge, food pantry or community center"], ["print", "Print shop, sign shop, screen printing or embroidery"], ["retail", "Shop: boutique, gifts, florist, antiques, thrift, feed or furniture"], ["general", "Something else: gym, clinic, daycare, studio, repair shop, any local business"]];
  const PRESENCE = { none: ["No website", "chip--good"], social: ["Only a social page", "chip--good"], elsewhere: ["Page on another site", "chip--good"], free_builder: ["Free-builder site", "chip--warn"], outdated: ["Outdated website", "chip--warn"], has_site: ["Has a website", "chip--warn"] };

  async function viewAdd() {
    setNav("home");
    $app.innerHTML = `<p><a href="#/">← Leads</a></p><h1>Add a business</h1>
      <p class="muted small">Found a business on a call, a drive or a tip? Look it up on Google and build its site, just like a run.</p>
      <form id="sq" class="card"><label class="field">Business name <span class="hint">Add the town if it's not in Cullman, e.g. “Smith Plumbing Hartselle”</span>
        <input name="q" required minlength="3" maxlength="120" autocomplete="off" placeholder="e.g. Rusty's Diner"></label>
        <button class="btn btn--primary" type="submit">Search Google</button></form>
      <ul class="list" id="results"></ul>
      <details class="card" id="manualBox"><summary><strong>Not on Google? Add it by hand</strong></summary>
        <p class="small muted">For a business Google Maps doesn't list. The site is built from what you type, so it starts with no hours, photos or reviews: fill those in on Edit. Offer them the Google profile setup too.</p>
        <form id="mf">
          <label class="field">Business name<input name="name" required minlength="2" maxlength="120" autocomplete="off"></label>
          <label class="field">Phone<input name="phone" type="tel" inputmode="tel" required autocomplete="off" placeholder="(256) 555-0123"></label>
          <label class="field">Town<input name="town" required maxlength="60" autocomplete="off" placeholder="Cullman" list="mfTowns"></label>
          <datalist id="mfTowns">${START_TOWNS.map(([t]) => `<option value="${t}">`).join("")}</datalist>
          <label class="field">Street address <span class="hint">optional; leave blank if they don't have a shop</span><input name="street" maxlength="120" autocomplete="off"></label>
          <label class="field">ZIP <span class="hint">optional</span><input name="zip" inputmode="numeric" maxlength="10" autocomplete="off"></label>
          <label class="field">What they do <span class="hint">a few words, e.g. “Party & event rentals”</span><input name="kind" maxlength="60" autocomplete="off"></label>
          <label class="field">Kind of business<select name="category" required><option value="">Pick the closest…</option>${PACKS.map(([k, t]) => `<option value="${k}">${t}</option>`).join("")}</select></label>
          <label class="field">Facebook or web page <span class="hint">optional, starts with https://</span><input name="web" type="url" maxlength="300" autocomplete="off"></label>
          <label class="check"><input type="checkbox" name="mobile"> They come to the customer (no shop to visit)</label>
          <div class="btns btns--full"><button class="btn btn--primary" type="submit">Add &amp; build site</button></div>
        </form></details>`;
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
    $app.querySelector("#mf").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target, b = f.querySelector("button");
      if (f.phone.value.replace(/\D/g, "").length < 10) { f.phone.focus(); return toast("Type their 10-digit phone number"); }
      b.disabled = true; b.innerHTML = '<span class="spin"></span> Adding…';
      try {
        const v = (k) => f[k].value.trim() || undefined;
        const res = await api("/leads/manual", { method: "POST", json: { name: v("name"), phone: v("phone"), town: v("town"), street: v("street"), zip: v("zip"), kind: v("kind"), category: f.category.value, web: v("web"), comesToCustomers: f.mobile.checked } });
        toast(res.existed ? "A business with that phone number is already in your leads" : "Added! Building the site now (about a minute).");
        go("#/lead/" + res.id);
      } catch (err) { toast(err.message); b.disabled = false; b.textContent = "Add & build site"; }
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
      ? `<table class="stats"><thead><tr><th>Who</th><th>Calls/visits</th><th>Reached</th><th>Interested</th><th>Sold</th></tr></thead><tbody>${rows
          .map((r) => `<tr><th scope="row">${esc(r.person)}</th><td>${r.calls}</td><td>${r.reached}</td><td>${r.interested}</td><td><strong>${r.sold}</strong></td></tr>`).join("")}</tbody></table>`
      : `<p class="muted small">No calls logged yet.</p>`;
    $app.innerHTML = `<h1>Sales</h1>
      <div class="grid grid--2">
        <section class="card"><h2>Monthly revenue</h2><p class="bignum">${money(d.monthlyRevenue)}<span class="small muted"> / month paid</span></p>
          <p class="small muted">${money(d.signedRevenue)}/month signed in total · ${d.clients.length} client${d.clients.length === 1 ? "" : "s"}. Mark a sign-up as paid on the lead once their payment is set up.</p></section>
        <section class="card"><h2>Commission this month</h2>${d.commissionOwed.length
          ? `<ul class="list">${d.commissionOwed.map((c) => `<li><strong>${esc(c.person)}</strong>: <strong>${money(c.amount)}</strong> <span class="small muted">(${c.sales} sale${c.sales === 1 ? "" : "s"}${c.bonus != null ? `: ${money(c.bonus)} up front + ${money(c.residual)} from earlier clients` : ""})</span></li>`).join("")}</ul>`
          : `<p class="muted small">No commission earned yet this month.</p>`}
          <p class="small muted">An estimate from paid sign-ups and the rules in Settings → Commission; Stripe is the record of what cleared. <a href="#/commission">💰 Commission calculator</a></p></section>
        <section class="card"><h2>This week</h2>${table(d.week)}</section>
        <section class="card"><h2>This month</h2>${table(d.month)}</section>
        ${pipe ? `<section class="card"><h2>In the pipeline</h2><p class="bignum">${money(pipe.monthlyIfPlus ?? pipe.shown * plusPlan.monthly)}<span class="small muted"> / month if they all buy ${esc(plusPlan.name)}</span></p>
          <p class="small muted">${pipe.shown} lead${pipe.shown === 1 ? "" : "s"} shown × ${money(plusPlan.monthly)} (${esc(plusPlan.name)}).</p></section>` : ""}
        ${(d.funnel || []).length ? `<section class="card funnel"><h2>From lead to live</h2><ol class="funnel__list">${d.funnel.map((st, i) => { const top = d.funnel[0].count || 1; return `<li><div class="row"><strong>${esc(st.label)}</strong><span>${st.count}${st.rate != null ? ` <span class="small muted">· ${Math.round(st.rate * 100)}% of the step before</span>` : ""}</span></div><div class="funnel__bar"><i style="width:${Math.max(2, Math.round((st.count / top) * 100))}%"></i></div>${st.medianDays != null ? `<p class="small muted" style="margin:2px 0 0">Typically ${st.medianDays < 1 ? "the same day" : `${st.medianDays} day${st.medianDays === 1 ? "" : "s"}`} after ${esc(d.funnel[i - 1].label.toLowerCase())}</p>` : ""}</li>`; }).join("")}</ol>
          <p class="small muted" style="margin:8px 0 0">Every lead that ever reached each step, and the typical (median) time between steps. A big drop between two steps is where to look.</p></section>` : ""}
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
            <p class="small muted" style="margin:2px 0 0">${esc(o.name)} · <a href="${telHref(String(o.phone || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, ""))}">${esc(o.phone || "")}</a> · ${esc(o.email || "")} · ${ago(o.createdAt)} · <a href="/api/agreements/s/${o.id}" target="_blank" rel="noopener">📄 agreement</a> · <a href="/api/agreements/s/${o.id}.pdf">⬇ PDF</a></p></li>`).join("")}</ul>
           <p class="small muted">People who bought from “Get started” on your website. Find their business with <a href="#/add">➕ Add a business</a> to build their site.</p>`
        : `<p class="muted small">None yet. People who buy from “Get started” on your website show up here.</p>`}</section>
      <p class="small muted">Calls are logged outcomes. Reached means someone answered. A sale counts for whoever sent the sign-up link, or whoever marked it Sold.</p>`;
    $app.querySelectorAll("[data-portal]").forEach((b) => b.addEventListener("click", async () => {
      b.disabled = true;
      try { await openPortal(b.dataset.portal); } catch (err) { toast(err.message); } finally { b.disabled = false; }
    }));
  }

  /* ---------- inbox ---------- */
  // What they asked for, in one line: the service, or the part + vehicle (Reserve a part), or the pickup items.
  function requestLine(d) {
    const vehicle = [d.year, d.make, d.model].filter(Boolean).join(" ") || d.vehicle;
    const bits = [d.service, d.part, vehicle, d.items, d.address, d.best_day ? "best day " + d.best_day : "", d.town, d.frequency, d.home_size, d.property, d.quantity].filter(Boolean).join(" · ");
    return d.topic ? d.topic + (bits ? ": " + bits : "") : bits;
  }
  async function viewInbox() {
    setNav("inbox");
    const my = renderSeq;
    const { items, blocked } = await api("/inbox");
    if (stale(my)) return;
    document.getElementById("inbox-dot").hidden = !items.some((i) => !i.read);
    const blockedHtml = blocked && blocked.month
      ? `<details class="card small"><summary>🛡️ ${blocked.month} spam message${blocked.month === 1 ? "" : "s"} blocked this month</summary>
          <p class="muted" style="margin:8px 0">Dropped by the spam checks on the website forms; nobody was alerted. If a real customer says they wrote and nothing arrived, look for them here.</p>
          <ul class="list">${(blocked.recent || []).map((b) => `<li><strong>${esc(b.who || "No name")}</strong> · ${esc(b.scope)} · ${ago(b.at)}<br><span class="muted">${esc(b.reasons.join(", "))}</span>${b.snippet ? `<br><em>${esc(b.snippet)}</em>` : ""}</li>`).join("")}</ul></details>`
      : "";
    $app.innerHTML = `<h1>Inbox</h1><p class="muted">Requests customers send through your clients' live websites.</p>
      ${blockedHtml}
      <ul class="list">${items.length ? items.map((i) => `<li class="card"><div class="lead__top"><strong>${esc(i.data.name)}</strong>${i.read ? "" : '<span class="chip chip--warn">New</span>'}</div>
        <p class="small muted">For ${esc(i.business || "a client")} · ${ago(i.createdAt)}</p>
        ${requestLine(i.data) ? `<p>${esc(requestLine(i.data))}</p>` : ""}
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
      <section class="card"><h2>📖 Guides</h2>
        <p class="small muted">How to set up and sell what we offer, with the exact buttons to tap. Prices in the guides come from Settings.</p>
        <div class="btns btns--full"><a class="btn" href="#/guide/tankboard">📋 Live inventory: the board, price page & QR tags</a><a class="btn" href="#/guide/pricetags">🏷️ QR price tags (the extra)</a><a class="btn" href="#/guide/display">📺 Tablet display by the tank</a><a class="btn" href="#/guide/costs">💵 What keeps the app running</a><a class="btn" href="#/guide/words">📖 What the words mean</a><a class="btn" href="#/training">🎓 Training course</a><a class="btn" href="#/changelog">📋 What's new</a><a class="btn" href="#/commission">💰 Commission calculator</a>${reportBtn()}</div></section>
      <section class="card"><h2>📬 Flyer mail-out</h2>
        <p class="small muted">Print the flyer, then write each business's 5-digit code in the white box. They type it at undergroundassociates.com/code, see their own sample site, and every phone gets an alert. The mail list is the best open leads with a street address, each with its code (codes stay the same; a coded preview is kept 90 days).</p>
        <div class="btns btns--full"><a class="btn btn--primary" href="/flyers/mailer.pdf" target="_blank" rel="noopener">🖨️ Print the flyer (PDF)</a><a class="btn" href="/api/mailing.csv?limit=50">⬇ Mail list: next 50 (CSV)</a><a class="btn" href="/api/mailing.csv?limit=250&all=1">⬇ Every coded lead (CSV)</a></div></section>
      <section class="card"><h2>💵 Costs & usage</h2>
        <p class="small muted">Every outside service the app depends on: what it costs, what we've used this month, when it renews and what stops if it lapses. For whoever minds the bills.</p>
        <div class="btns btns--full"><a class="btn btn--primary" href="#/costs">💵 Open Costs & usage</a><a class="btn" href="#/guide/costs">📖 The guide</a></div></section>
      <section class="card"><h2>Android app</h2>
        <p class="small muted">Install the app on an Android phone. After downloading, open the file and allow installing from this source if asked. Log in once in the app with the same password.</p>
        <a class="btn" href="/api/android.apk" download>Download Android app</a></section>
      ${isOwner() ? tapCard() : ""}`;
  }

  // Claude API key (owner): paste a key from another Anthropic account when one runs out of credit. The server checks it
  // with a tiny request before saving; only the last 4 characters ever come back.
  function aiKeyCard() {
    return `<section class="card" id="aikey"><h2>🤖 Claude API key</h2>
      <p class="small muted">The key the app uses to write websites, call guides and designs. Out of credit? Paste a key from another Anthropic account (console.anthropic.com → API keys). It's checked before it's saved.</p>
      <p id="aikeystate" class="small">Checking…</p><p id="aikeyerr" class="small" hidden></p>
      <form id="aikeyform"><label class="field">New key<input name="key" type="password" autocomplete="off" spellcheck="false" placeholder="sk-ant-…" required></label>
        <div class="btns"><button class="btn btn--primary" type="submit">Check and use this key</button><button class="btn" type="button" id="aikeyclear" hidden>Go back to the original key</button></div></form></section>`;
  }
  function aiKeyLine(st) {
    if (st.unreadable) return "⚠️ A saved key can't be read any more (the app's secret changed). Paste it again." + (st.workerKey ? " Until then the original key is used." : "");
    if (st.using === "app") return `✅ Using the key you saved here, ending <strong>…${esc(st.last4 || "")}</strong>${st.savedBy ? `, saved by ${esc(st.savedBy)}` : ""}${st.savedAt ? ` on ${new Date(st.savedAt).toLocaleDateString()}` : ""}.`;
    if (st.using === "worker") return "Using the original key (set on the server).";
    return "⚠️ No key is set: AI writing is off until you add one.";
  }
  async function bindAiKey() {
    const box = $app.querySelector("#aikey");
    if (!box) return;
    const state = box.querySelector("#aikeystate");
    const clear = box.querySelector("#aikeyclear");
    const show = (st) => {
      state.innerHTML = aiKeyLine(st);
      clear.hidden = !(st.using === "app" || st.unreadable) || !st.workerKey;
    };
    try { show(await api("/aikey")); } catch (e) { state.textContent = e.message; }
    box.querySelector("#aikeyform").addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = e.target.querySelector("[name=key]");
      const btn = e.target.querySelector("[type=submit]");
      btn.disabled = true;
      btn.textContent = "Checking the key…";
      const errLine = box.querySelector("#aikeyerr");
      errLine.hidden = true;
      try {
        show(await api("/aikey", { method: "PUT", json: { key: input.value.trim() } }));
        input.value = "";
        toast("New Claude key saved. The app uses it from now on.");
      } catch (err) {
        errLine.textContent = "⚠️ " + err.message;
        errLine.hidden = false;
      } finally {
        btn.disabled = false;
        btn.textContent = "Check and use this key";
      }
    });
    clear.addEventListener("click", async () => {
      if (!confirm("Stop using the key saved here and go back to the original one?")) return;
      try { show(await api("/aikey", { method: "DELETE" })); toast("Back on the original key."); } catch (err) { toast(err); }
    });
  }

  function tapCard() {
    const t = meta.tap || {};
    return `<section class="card" id="tapcard"><h2>💳 Tap to Pay</h2>
      <p class="small muted">Take a client's card on your phone, in person: they sign on the sign-up page, then tap their card on the back of the phone. The card is saved in Stripe for the monthly or yearly renewals. Needs the Android app (version 2.0 or newer).</p>
      ${t.ready
        ? `<p class="chip chip--good">Ready · location ${esc(t.locationId || "")}</p><p class="small muted">${esc(t.address || "")}</p>`
        : `<p class="small"><strong>Not ready:</strong> ${esc(t.why || "Stripe isn't connected.")}</p>${meta.checkout && meta.checkout.online ? `<button class="btn btn--primary" type="button" id="tapsetup">Set up Tap to Pay</button>` : ""}`}
      <details class="small" style="margin-top:10px"><summary>Phone requirements (Stripe's rules)</summary><ul>
        <li>Android 13 or newer with NFC and a security update from the last 12 months (the Fold is fine).</li>
        <li>NFC and Location turned on; Location allowed for the app the first time.</li>
        <li><strong>Developer options off</strong>, no screen recorder or screen-overlay app running while taking a payment.</li>
        <li>Google Play Store installed and the phone not rooted.</li>
        <li>Fees: 2.7% + 5¢ + 10¢ per tap; renewals on the saved card are normal online charges (2.9% + 30¢).</li></ul></details></section>`;
  }

  function bindDevice() {
    const setup = $app.querySelector("#tapsetup");
    if (setup) setup.addEventListener("click", async () => {
      setup.disabled = true;
      try {
        const r = await api("/tap/setup", { method: "POST", json: {} });
        toast(`Tap to Pay is set up (${r.locationId})`);
        meta = await api("/meta");
        const card = document.getElementById("tapcard");
        if (card) card.outerHTML = tapCard();
      } catch (err) { toast(err.message); setup.disabled = false; }
    });
    $app.querySelector("#logout").addEventListener("click", async () => { await api("/auth/logout", { method: "POST" }); meta = null; go("#/login"); });
    const inst = $app.querySelector("#install");
    inst.addEventListener("click", async () => { if (!installPrompt) return; installPrompt.prompt(); installPrompt = null; inst.hidden = true; });
  }

  function callersCard(callers) {
    return `<section class="card"><h2>Team</h2>
      <p class="small muted"><strong>Callers</strong> work leads end to end: calls, previews, edits, sign-ups, payments, publishing. <strong>Full access</strong> adds Settings, runs, Sales, Inbox and Costs.</p>
      <p class="small">Everyone signs in at <strong>https://app.undergroundassociates.com</strong> (laptop or any phone browser; add it to the home screen), or installs the Android app from Settings → Android app.</p>
      <ul class="list">${callers.length ? callers.map((c) => `<li><div class="row"><strong>${esc(c.name)}</strong><span class="chip${c.admin ? " chip--good" : ""}" style="flex:none">${c.admin ? "Full access" : "Caller"}</span>${c.disabled ? `<span class="chip" style="flex:none">Turned off</span>` : ""}</div>
        <p class="small muted" style="margin:2px 0 0">${c.email ? `✉️ ${esc(c.email)}${c.googleOnly ? " · Google sign-in only" : ""}` : "No Google address yet"} · ⏱ ${c.hourlyCents ? `$${(c.hourlyCents / 100).toFixed(2)}/hr (uses the time clock)` : "commission only"}</p>
        <div class="btns" style="margin-top:6px">
          <button class="btn btn--small" data-cemail="${c.id}" data-email="${esc(c.email || "")}">${c.email ? "Change email" : "Add Google email"}</button>
          <button class="btn btn--small" data-cpay="${c.id}" data-pay="${c.hourlyCents ? (c.hourlyCents / 100).toFixed(2) : ""}">${c.hourlyCents ? "Change hourly pay" : "Set hourly pay"}</button>
          <button class="btn btn--small" data-cpass="${c.id}">New password</button>
          ${c.id === meta.me.id ? "" : `<button class="btn btn--small" data-cadmin="${c.id}" data-admin="${c.admin ? 1 : 0}">${c.admin ? "Make caller" : "Give full access"}</button>`}
          <button class="btn btn--small" data-ctoggle="${c.id}" data-off="${c.disabled ? 1 : 0}">${c.disabled ? "Turn on" : "Turn off"}</button>
          <button class="btn btn--small btn--danger" data-cdel="${c.id}">Remove</button></div></li>`).join("") : `<li class="muted small">No callers yet.</li>`}</ul>
      <div style="margin-top:12px"><h3>Backup</h3><p class="small muted">A copy of your leads, notes, sign-ups and settings as a file. Keep it somewhere safe now and then.</p>
        <a class="btn btn--small" href="/api/backup" download="website-business-backup.json">⬇️ Download backup</a></div>
      <form id="cf" style="margin-top:12px"><h3>Add someone</h3>
        <label class="field">Their name<input name="name" maxlength="60" required placeholder="Used in texts, call guides and notes"></label>
        <label class="field">Their company Google address <span class="hint">They sign in with Google using this address (anyone on the company domain can also just sign in and shows up here as a caller).</span><input name="email" type="email" autocomplete="off" placeholder="name@${esc((meta.settings && meta.settings.googleDomain) || "undergroundassociates.com")}"></label>
        <label class="field">Their password <span class="hint">Optional when they have a Google address. At least 8 characters, different from everyone else's.</span><input name="password" type="text" minlength="8" autocomplete="off"></label>
        <label class="check"><input type="checkbox" name="admin"> Full access (can do everything you can)</label>
        <button class="btn btn--primary" type="submit">Add</button></form></section>`;
  }

  function bindCallers() {
    const mt = $app.querySelector("[data-act=mailtest]");
    if (mt) mt.addEventListener("click", async () => {
      const out = $app.querySelector("[data-mailtest-out]");
      mt.disabled = true; out.textContent = " Sending…";
      try {
        const r = await api("/mail/test", { method: "POST", json: {} });
        out.textContent = r.ok ? ` Sent to ${r.to} through ${r.provider === "resend" ? "Resend" : "MailerSend"}. Check your inbox (and spam) in a minute.` : ` Failed: ${r.error || "unknown error"}`;
      } catch (err) { out.textContent = ` ${err.message}`; }
      mt.disabled = false;
    });
    $app.querySelector("#cf").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target;
      try {
        await api("/callers", { method: "POST", json: { name: f.name.value.trim(), password: f.password.value || undefined, email: f.email.value.trim() || undefined, admin: f.admin.checked } });
        toast(f.email.value.trim() ? "Added. They sign in with Google." : "Added. They log in with that password.");
        viewSettings();
      } catch (err) { toast(err.message); }
    });
    $app.querySelectorAll("[data-cemail]").forEach((b) => b.addEventListener("click", async () => {
      const email = prompt("Their company Google address (blank to remove):", b.dataset.email || "");
      if (email === null) return;
      try { await api(`/callers/${b.dataset.cemail}`, { method: "PUT", json: { email: email.trim() || null } }); viewSettings(); } catch (err) { toast(err.message); }
    }));
    $app.querySelectorAll("[data-cpay]").forEach((b) => b.addEventListener("click", async () => {
      const v = prompt("Hourly pay in dollars (for example 15 or 15.50). Leave blank for commission only; they then don't see the time clock.", b.dataset.pay || "");
      if (v === null) return;
      const n = v.trim() ? Number(v.replace(/[$,\s]/g, "")) : 0;
      if (!Number.isFinite(n) || n < 0 || n > 1000) return toast("Type a dollar amount like 15.50");
      try { await api(`/clock/pay/${b.dataset.cpay}`, { method: "PUT", json: { hourlyCents: n ? Math.round(n * 100) : null } }); toast(n ? "Hourly pay saved. They can clock in from Tasks." : "Set to commission only"); viewSettings(); } catch (err) { toast(err.message); }
    }));
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

  const PLAN_IDS = ["basic", "plus", "pro", "list"];
  // Priced from market research (Oct 2026): pay-monthly website services charge $78-150/mo, Hibu $99-159/mo,
  // Google Business Profile management $100-400/mo on its own.
  const SUGGESTED_PLANS = [
    { id: "basic", name: "Basic", setup: 0, monthly: 49, includes: "Your website on fast, secure hosting\nSmall text, hours and photo updates\nTap-to-call and directions on every page\nLive price list with QR tags and a tablet display, if your stock changes" },
    { id: "plus", name: "Plus", setup: 0, monthly: 89, includes: "Everything in Basic\nMonthly visitor report by text\nGoogle Business Profile tune-up\nGoogle review QR cards for your counter" },
    { id: "pro", name: "Pro", setup: 0, monthly: 149, includes: "Everything in Plus\nMonthly Google profile posts and photo updates\nYour own domain name, bought and renewed for you, in your name\nBusiness email (info@yourbusiness.com): free forwarding to the email you already use, or a full Google mailbox we set up, billed to you by Google\nPriority changes" },
    { id: "list", name: "Price list", setup: 0, monthly: 29, includes: "A live price page for your business, with a section for every tank, shelf, bin or row\nYour board: change names, prices, counts and photos from your phone, any time, no login\nPut your whole list on at once: paste it from a spreadsheet or your register's export\nSold out hides an item until it's back; the page shows how many are left\nQR price tags for every section (first sheet included) and a tablet display page\nStaff mode on the tablet: count stock in and out and add new items, PIN-locked\nFast, secure hosting; changes when you text us\nNo minimum: cancel any time. Upgrade to a full website any time" },
  ];
  const UNIT_LABEL = { month: "/month", each: " each", "one-time": " one-time", quote: " (priced per job)" };
  const addonPrice = (a) => (a.unit === "quote" ? "Priced per job" : `${money(a.price)}${UNIT_LABEL[a.unit] || ""}`);
  // Inventory add-ons are listed together everywhere (mirrors addonGroup in db.ts).
  const INVENTORY_EXTRA = /price tag|shelf label|tablet|scanner|scanning|stock list|inventory|price list|stock board|tank board/i;
  const addonGroup = (a) => a.group || (INVENTORY_EXTRA.test(a.name) ? "inventory" : "general");

  // Playbook: when a caller should bring each extra up (matched on the extra's name).
  const OFFER_HINT = [
    [/\bdomain\b/i, "Anyone who wants their own .com but doesn't want to buy it themselves. Free on Pro; they can also bring their own or use the free address."],
    [/order|book/i, "Restaurants, salons and groomers that already use Square, Toast, DoorDash, Booksy or Calendly."],
    [/listed/i, "Anyone. Ask: “Do you show up on Apple Maps?” Most small shops don't."],
    [/google business/i, "Anyone whose Google listing has old hours, few photos or no description."],
    [/photo/i, "Anyone with no photos, or only Google's. Their site looks twice as good."],
    [/spanish/i, "Mexican restaurants, landscapers, cleaners and shops with Spanish-speaking customers."],
    [/hiring/i, "Restaurants and trades that are hiring. Look for “Now hiring” on their Facebook."],
    [/rush|same-day/i, "Grand openings, busy season, or an event coming up."],
    [/social/i, "Busy owners whose Facebook hasn't posted in months."],
    [/table|window/i, "Restaurants (table tents), shops and salons (counter and window)."],
    [/cards|yard|door/i, "Trades (yard signs, door hangers) and anyone out of business cards."],
    [/logo/i, "No logo, or a blurry one on their Facebook."],
    [/review card|nfc/i, "Busy counters: restaurants, salons, shops. More reviews, higher on Maps."],
    [/changes/i, "Bigger jobs beyond the plan: a new page or section, a redesign."],
    [/ads?\b|ad management/i, "Contractors in busy season; restaurants with a new menu or event."],
    [/tablet/i, "Any shop with a board: one tablet by the busiest tank, shelf or counter. We bring it, set it up and mount it."],
    [/scanning/i, "Any shop with packaged stock (feed, filters, parts, bottles, food): deliveries counted in by scanning, on their phone or the tablet."],
    [/scanner/i, "Shops with packaged stock (feed, filters, parts, bottles): a delivery is counted in by scanning."],
    [/stock list|inventory/i, "Shops with a long list in a spreadsheet, a register export or on paper who don't want to type it."],
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

  /**
   * Settings: every card folds behind its heading (tap to open, tap again to close) so the page stays short; most
   * sections are rarely edited. Open/closed is remembered per heading on this phone. Hidden fields still save.
   */
  function collapsibleSections() {
    // The business form is one long card with sub-headings (Your business, Website, Team sign-in, Phone alerts, Plans &
    // prices, Ways to pay, Extras, Team goals, Runs): each heading folds what follows it, like the Android app's sections.
    // Nodes are only moved, never recreated, so the form still submits everything (hidden fields are submitted too).
    const form = $app.querySelector("form#sf");
    if (form && !form.dataset.fold) {
      form.dataset.fold = "1";
      let body = null;
      for (const el of [...form.children]) {
        if (el.matches(".sticky-save")) { body = null; continue; }
        if (el.tagName === "H2") {
          const h = el;
          const key = "fold.form." + h.textContent.replace(/[^a-z]/gi, "").toLowerCase();
          body = document.createElement("div");
          h.after(body);
          const arrow = document.createElement("span");
          arrow.className = "muted";
          arrow.style.cssText = "float:right;font-weight:400";
          h.appendChild(arrow);
          h.style.cursor = "pointer";
          let open = false;
          try { open = localStorage.getItem(key) === "1"; } catch {}
          const b = body;
          const paint = () => { b.hidden = !open; arrow.textContent = open ? "▴" : "▾"; };
          h.addEventListener("click", () => { open = !open; try { localStorage.setItem(key, open ? "1" : "0"); } catch {} paint(); });
          paint();
          continue;
        }
        if (body) body.appendChild(el);
      }
      // A field the browser flags on Save (a bad number, a missing name) must be visible, or the message points at nothing.
      form.addEventListener("invalid", (e) => { const fold = e.target.closest("form#sf > div[hidden]"); if (fold) fold.previousElementSibling.click(); }, true);
    }
    $app.querySelectorAll("section.card").forEach((card) => {
      const h = card.querySelector(":scope > h2");
      if (!h || card.dataset.fold) return;
      card.dataset.fold = "1";
      const key = "fold." + h.textContent.replace(/[^a-z]/gi, "").toLowerCase();
      const body = document.createElement("div");
      while (h.nextSibling) body.appendChild(h.nextSibling);
      card.appendChild(body);
      const arrow = document.createElement("span");
      arrow.className = "muted";
      arrow.style.cssText = "float:right;font-weight:400";
      h.appendChild(arrow);
      h.style.cursor = "pointer";
      let open = false;
      try { open = localStorage.getItem(key) === "1"; } catch {}
      const paint = () => { body.hidden = !open; arrow.textContent = open ? "▴" : "▾"; };
      h.addEventListener("click", () => { open = !open; try { localStorage.setItem(key, open ? "1" : "0"); } catch {} paint(); });
      paint();
    });
  }

  /** Chips under the health strip that open a folded section of the business form (Plans & prices, Team sign-in…). */
  function settingsJumpChips() {
    const form = $app.querySelector("form#sf");
    const heads = form ? [...form.querySelectorAll(":scope > h2")] : [];
    const cards = [...$app.querySelectorAll("section.card > h2")];
    const all = [...heads, ...cards];
    if (!all.length) return;
    const el = document.getElementById("health");
    const nav = document.createElement("nav");
    nav.className = "jump";
    nav.setAttribute("aria-label", "Jump to a section");
    nav.innerHTML = `<span class="small muted">Jump to:</span> ` + all.map((h, i) => `<button type="button" class="chip" data-jump="${i}">${esc(h.textContent.replace(/[▾▴]/g, "").trim())}</button>`).join(" ");
    el.after(nav);
    nav.querySelectorAll("[data-jump]").forEach((b) => b.addEventListener("click", () => openSettingsSection(all[Number(b.dataset.jump)])));
  }
  function openSettingsSection(h) {
    if (!h) return;
    const body = h.nextElementSibling;
    if (body && body.hidden) h.click();
    h.scrollIntoView({ behavior: "smooth", block: "start" });
    const card = h.closest("section, form");
    if (card) { card.classList.add("is-jump"); setTimeout(() => card.classList.remove("is-jump"), 2500); }
  }
  /** The health strip: every outside piece (Stripe, Tap to Pay, email, Google sign-in, alerts…) and what to do when one's off. */
  async function loadHealth() {
    const el = document.getElementById("health");
    if (!el) return;
    try {
      const { items } = await api("/health");
      if (!document.getElementById("health")) return;
      const bad = items.filter((i) => i.state !== "ok").length;
      const dot = (st) => `<span class="health__dot health__dot--${st}" aria-hidden="true"></span>`;
      el.innerHTML = `<section class="card health"><h2>${bad ? `🔌 Connections · ${bad} to look at` : "🔌 Connections · all good"}</h2>
        <ul class="health__list">${items.map((i) => `<li class="health__item health__item--${i.state}">${dot(i.state)}<div><strong>${esc(i.label)}</strong><span class="small muted"> · ${esc(i.detail)}</span>${i.state !== "ok" && i.section ? ` <button type="button" class="linkbtn small" data-health-section="${esc(i.section)}">Open ${esc(i.section)}</button>` : ""}</div></li>`).join("")}</ul>
        <p class="small muted" style="margin:8px 0 0">Secrets (Stripe, email, search keys) are set with wrangler, not here. Green means connected and working; yellow works but something is missing; grey is off.</p></section>`;
      el.querySelectorAll("[data-health-section]").forEach((b) => b.addEventListener("click", () => {
        const want = b.dataset.healthSection.toLowerCase();
        const h = [...$app.querySelectorAll("form#sf > h2, section.card > h2")].find((x) => x.textContent.toLowerCase().includes(want));
        openSettingsSection(h);
      }));
    } catch (err) { el.innerHTML = `<p class="small muted">Couldn't check connections: ${esc(err.message)}</p>`; }
  }
  /** Problems the team reported with "Report this": screen, step, the error, the phone; Done hides them. */
  async function loadProblems() {
    const el = document.getElementById("problems");
    if (!el) return;
    try {
      const { problems } = await api("/problems");
      if (!document.getElementById("problems")) return;
      const open = problems.filter((p) => p.status === "open");
      if (!problems.length) { el.innerHTML = ""; return; }
      const row = (p) => `<li class="${p.status === "done" ? "muted" : ""}"><div class="row"><strong>${esc(p.who || "Someone")}</strong> <span class="small muted">· ${esc(p.app)} · ${esc(p.screen || "")} · ${ago(p.at)}</span>${p.status === "open" ? `<button class="btn btn--small" type="button" data-problem-done="${esc(p.id)}" style="flex:none">Done</button>` : ""}</div>
        <p class="small" style="margin:4px 0 0">${p.step ? `<strong>Doing:</strong> ${esc(p.step)}<br>` : ""}<strong>Error:</strong> ${esc(p.message)}${p.leadName ? ` · <a href="#/lead/${esc(p.leadId)}">${esc(p.leadName)}</a>` : ""}</p>
        ${p.detail || p.device ? `<details class="more"><summary class="small">Details</summary><pre class="small" style="white-space:pre-wrap;word-break:break-word">${esc(p.device || "")}\n${esc(p.detail || "")}</pre></details>` : ""}</li>`;
      el.innerHTML = `<section class="card"><h2>🐞 Problems reported${open.length ? ` · ${open.length} open` : ""}</h2>
        <ul class="list">${open.map(row).join("")}</ul>
        ${problems.length > open.length ? `<details class="more"><summary>Handled (${problems.length - open.length})</summary><ul class="list">${problems.filter((p) => p.status === "done").slice(0, 20).map(row).join("")}</ul></details>` : ""}</section>`;
      el.querySelectorAll("[data-problem-done]").forEach((b) => b.addEventListener("click", async () => {
        b.disabled = true;
        try { await api(`/problems/${b.dataset.problemDone}/done`, { method: "POST" }); loadProblems(); } catch (err) { toast(err.message); b.disabled = false; }
      }));
    } catch (err) { el.innerHTML = ""; }
  }

  async function viewSettings() {
    setNav("settings");
    const my = renderSeq;
    meta = await api("/meta");
    if (stale(my)) return;
    if (!isOwner()) {
      $app.innerHTML = `<h1>Settings</h1><div class="grid grid--2">${deviceCard()}<section class="card"><h2>Help</h2><div class="btns btns--full"><a class="btn" href="#/commission">💰 What I'd earn</a><a class="btn" href="#/training">🎓 Training</a><a class="btn" href="#/guide/words">📖 What the words mean</a><a class="btn" href="#/changelog">📋 What's new</a>${reportBtn()}</div><p class="small muted">Something didn't work? Report it and the owner sees the screen, the step and the error.</p></section></div>`;
      return bindDevice();
    }
    const [{ last30Days: u }, { callers }] = await Promise.all([api("/usage"), api("/callers")]);
    if (stale(my)) return;
    const s = meta.settings;
    $app.innerHTML = `<h1>Settings</h1><div id="health"><p class="small muted"><span class="spin"></span> Checking what's connected…</p></div><div id="problems"></div><div class="grid grid--2">
      <form id="sf" class="card settings-form"><h2>Your business</h2>
        <label class="field">Company name <span class="hint">What clients see</span><input name="companyName" value="${esc(s.companyName || "")}" placeholder="e.g. Underground Associates"></label>
        <label class="field">Legal name <span class="hint">Who signs client agreements</span><input name="legalName" value="${esc(s.legalName || "")}" placeholder="e.g. Underground Associates LLC"></label>
        <div class="row"><label class="field">Business phone<input name="companyPhone" type="tel" value="${esc(s.companyPhone || "")}"></label>
        <label class="field">Business email <span class="hint">Shown everywhere</span><input name="companyEmail" type="email" value="${esc(s.companyEmail || "")}"></label></div>
        <div class="row"><label class="field">Billing email <span class="hint">Cancellations, card updates, disputes (agreement + terms page). Blank = business email</span><input name="billingEmail" type="email" value="${esc(s.billingEmail || "")}" placeholder="billing@…"></label>
        <label class="field">Support email <span class="hint">Website footer, change requests, notices. Blank = business email</span><input name="supportEmail" type="email" value="${esc(s.supportEmail || "")}" placeholder="support@…"></label></div>
        <label class="field">Stripe publishable key <span class="hint">From Stripe → Developers → API keys (starts with pk_live_). Lets the Android app take a card typed on the phone. Not a secret.</span><input name="stripePublishableKey" value="${esc(s.stripePublishableKey || "")}" placeholder="pk_live_…" autocomplete="off"></label>
        <label class="field">Business street address <span class="hint">Needed once for Tap to Pay (Stripe registers where in-person payments happen). Not shown to clients.</span><input name="companyStreet" value="${esc(s.companyStreet || "")}" placeholder="123 2nd Ave SW" autocomplete="street-address"></label>
        <div class="row"><label class="field">City<input name="companyCity" value="${esc(s.companyCity || "")}" placeholder="Cullman"></label>
        <label class="field">State<input name="companyState" value="${esc(s.companyState || "AL")}" maxlength="2" style="text-transform:uppercase"></label>
        <label class="field">ZIP<input name="companyZip" value="${esc(s.companyZip || "")}" inputmode="numeric" placeholder="35055"></label></div>
        <label class="field">Our Google review link <span class="hint">From your Google profile: “Ask for reviews” → copy link. Texted to happy clients.</span><input name="companyReviewUrl" type="url" value="${esc(s.companyReviewUrl || "")}" placeholder="https://g.page/r/…/review"></label>
        <label class="field">Our Facebook page <span class="hint">Linked in the website footer</span><input name="companyFacebookUrl" type="url" value="${esc(s.companyFacebookUrl || "")}" placeholder="https://www.facebook.com/…"></label>
        <label class="field">Calendar email <span class="hint">Tasks for you with a date are sent here as calendar invites (your Google Calendar address). Blank uses your direct email.</span><input name="calendarEmail" type="email" value="${esc(s.calendarEmail || "")}" placeholder="post@undergroundassociates.com"></label>
        <label class="field">Google tag ID <span class="hint">From Google Analytics / Ads, like G-XXXXXXXXXX. Added to every page of the company website; blank turns it off.</span><input name="gaMeasurementId" value="${esc(s.gaMeasurementId || "")}" placeholder="G-XXXXXXXXXX" style="text-transform:uppercase"></label>
        <label class="field">Owner's direct email <span class="hint">Shown on your website as "Need the owner directly?"</span><input name="directEmail" type="email" value="${esc(s.directEmail || "")}" placeholder="post@undergroundassociates.com"></label>
        <label class="field">Google account for client profiles <span class="hint">Clients add this email as a Manager on their Google listing</span><input name="gbpEmail" type="email" value="${esc(s.gbpEmail || "")}" placeholder="yourbusiness@gmail.com"></label>
        ${!meta.me.id || meta.me.id === "owner" ? `<label class="field">Your name <span class="hint">Your texts say "Hi, this is ___ with ${esc(s.companyName || "your company")}". Everyone else's texts use their own login names.</span><input name="callerName" value="${esc(s.callerName || "")}" placeholder="e.g. Post"></label>` : ""}
        <h2 style="margin-top:18px">Website</h2>
        <p class="small muted">undergroundassociates.com is built from these settings every time it loads (prices, plans and extras come from the Sales and Extras sections). Blank fields use the standard wording.</p>
        <label class="field">Headline <span class="hint">The big line at the top. Standard: "Your website is already built. See it before you pay a dime."</span><input name="siteHeadline" value="${esc(s.siteHeadline || "")}" maxlength="120" placeholder="Your website is already built. See it before you pay a dime."></label>
        <label class="field">Lead line <span class="hint">The sentence or two under the headline. Blank writes it from your prices.</span><textarea name="siteLead" rows="2" maxlength="400" placeholder="We build a real website for your business from your Google listing, free…">${esc(s.siteLead || "")}</textarea></label>
        <label class="field">About you <span class="hint">The paragraph next to your photo ("Hi, I'm Post."). Add app/public/owner.jpg for the photo.</span><textarea name="siteBio" rows="3" maxlength="1200">${esc(s.siteBio || "")}</textarea></label>
        <label class="field">Client quotes <span class="hint">One per line: <code>Quote | Name, Business</code>. Only real clients who said it; the first shows under the top of the home page, the rest on the pricing page.</span><textarea name="siteTestimonials" rows="3" maxlength="3000" placeholder="They had the site done before I'd even decided. | Jane Doe, Doe's Diner">${esc(s.siteTestimonials || "")}</textarea></label>
        <label class="field">Towns served <span class="hint">Comma-separated. The "where we work" page, the footer and what Google is told you serve.</span><input name="siteTowns" value="${esc(s.siteTowns || "")}" maxlength="400" placeholder="Cullman, Hanceville, Good Hope, Vinemont, Holly Pond, Hartselle, Arab"></label>
        <label class="field">Turnstile site key <span class="hint">Stops bots on the website's forms (free, from Cloudflare). Dashboard → Turnstile → Add widget, hostname undergroundassociates.com → paste the <strong>Site key</strong> here, and add the <strong>Secret key</strong> to the Worker as the secret TURNSTILE_SECRET_KEY (Workers &amp; Pages → website-business → Settings → Variables and Secrets). Blank = off; the hidden-field, timing and content checks still run. Blocked messages are counted in the Inbox.</span><input name="turnstileSiteKey" value="${esc(s.turnstileSiteKey || "")}" maxlength="80" placeholder="0x4AAAAAAA…" autocomplete="off"></label>
        <label class="field">Google Analytics account for client sites <span class="hint">Every site we publish gets its own Google Analytics property under this account, with the tag on every page. analytics.google.com → Admin → Create account (e.g. "Underground Associates Clients") → Account settings → copy the Account ID (a number) here. The connections strip at the top of Settings shows the two other steps (switch on the Admin API, add our service account as Administrator). Blank = off.</span><input name="gaAccountId" value="${esc(s.gaAccountId || "")}" maxlength="30" inputmode="numeric" placeholder="123456789" autocomplete="off"></label>
        <h2 style="margin-top:18px">Team sign-in (Google)</h2>
        <p class="small muted">Everyone signs in with their company Google account. One-time setup in Google Cloud (see the Android app card below for the steps), then paste the web client ID here.</p>
        <label class="field">Google client ID <span class="hint">The OAuth “Web application” client, ends in .apps.googleusercontent.com</span><input name="googleClientId" value="${esc(s.googleClientId || "")}" placeholder="1234567890-abc.apps.googleusercontent.com" autocomplete="off"></label>
        <div class="row"><label class="field">Company domain<input name="googleDomain" value="${esc(s.googleDomain || "undergroundassociates.com")}"></label>
        <label class="field">Owner's Google address <span class="hint">This address signs in as the owner</span><input name="ownerEmail" type="email" value="${esc(s.ownerEmail || "")}" placeholder="post@undergroundassociates.com"></label></div>
        <label class="check"><input type="checkbox" name="requireGoogle"${s.requireGoogle ? " checked" : ""}> Turn passwords off (Google only). Turn this on once your own Google sign-in works.</label>
        <h2 style="margin-top:18px">Phone alerts (Firebase)</h2>
        <p class="small muted">Instant pushes to every phone with the Android app: a new app build and team alerts arrive within seconds instead of up to 15 minutes. One-time Firebase setup, then paste the four public values from Project settings → General (Sender ID is under Cloud Messaging). The service-account JSON goes in Cloudflare as the Worker secret <code>FCM_SERVICE_ACCOUNT</code>, never here.</p>
        <p class="small">${meta.fcm && meta.fcm.server ? `<span class="chip chip--good">Worker secret set</span>` : `<span class="chip chip--warn">Worker secret FCM_SERVICE_ACCOUNT not set yet: the server can't send pushes</span>`}</p>
        <label class="field">App ID <span class="hint">Looks like 1:123456789:android:0a1b2c…</span><input name="fcmAppId" value="${esc(s.fcmAppId || "")}" placeholder="1:…:android:…" autocomplete="off"></label>
        <label class="field">Web API key <span class="hint">Starts with AIza. Public, not a secret.</span><input name="fcmApiKey" value="${esc(s.fcmApiKey || "")}" placeholder="AIza…" autocomplete="off"></label>
        <div class="row"><label class="field">Project ID<input name="fcmProjectId" value="${esc(s.fcmProjectId || "")}" placeholder="underground-associates-1a2b3"></label>
        <label class="field">Sender ID<input name="fcmSenderId" value="${esc(s.fcmSenderId || "")}" inputmode="numeric" placeholder="123456789012"></label></div>
        <h2 style="margin-top:18px">Plans &amp; prices</h2>
        <div class="card small" style="margin:8px 0">${meta.checkout && meta.checkout.online
          ? `✅ <strong>Online checkout is on.</strong> Sign-up links, “Buy now” on your website and “Buy extras” links all go to a Stripe checkout with exactly what the client picked. The payment links below aren't needed.`
          : `<strong>Online checkout isn't on yet.</strong> Add your Stripe key as the Cloudflare secret <code>STRIPE_SECRET_KEY</code> and clients can pick a plan, way to pay and extras and pay in one checkout. Until then, the payment links below are used (plan only).`}
          ${meta.checkout && !meta.checkout.webhook ? `<br>⚠️ Payments won't mark clients Paid by themselves until the Stripe webhook secret (<code>STRIPE_WEBHOOK_SECRET</code>) is added.` : ""}
          <br>${meta.checkout && meta.checkout.email ? `✅ <strong>Automatic emails are on</strong> (clients who ask for extras on your website get their Buy extras link by email). <button class="linkbtn" type="button" data-act="mailtest">Send me a test email</button><span data-mailtest-out></span>` : "Automatic emails are off. Add <code>RESEND_API_KEY</code> to email clients their Buy extras link when they ask on your website."}</div>
        <p class="small muted">${s.plans.length ? "" : "Suggested starting plans are filled in below. Change them to your prices, then Save. "}Leave a plan's name blank to hide it.</p>
        ${planRows(s.plans)}
        <h2 style="margin-top:18px">Ways to pay</h2>
        <div class="row" style="flex-wrap:wrap"><label class="field" style="flex:1 1 120px">Short plan (months) <span class="hint">No setup fee · 0 = don't offer</span><input name="shortMonths" type="number" min="0" max="36" inputmode="numeric" value="${s.shortMonths ?? 6}"></label>
        <label class="field" style="flex:1 1 120px">Standard plan (months) <span class="hint">No setup fee</span><input name="minMonths" type="number" min="0" max="36" inputmode="numeric" value="${s.minMonths ?? 12}"></label>
        <label class="field" style="flex:1 1 120px">Month-to-month setup ($) <span class="hint">0 = don't offer</span><input name="flexSetup" type="number" min="0" inputmode="decimal" value="${s.flexSetup ?? 299}"></label>
        <label class="field" style="flex:1 1 120px">Yearly: months free <span class="hint">0 = don't offer</span><input name="annualMonthsFree" type="number" min="0" max="6" inputmode="numeric" value="${s.annualMonthsFree ?? 2}"></label>
        <label class="field" style="flex:1 1 120px">Late fee ($) <span class="hint">Added once per missed payment, 10 days after it fails · 0 = none</span><input name="lateFee" type="number" min="0" max="500" step="0.01" inputmode="decimal" value="${s.lateFee ?? 15}"></label>
        <label class="field" style="flex:1 1 120px">Early payoff discount (%) <span class="hint">Off the remaining months when they pay the early cancellation fee up front · 0 = none</span><input name="payoffDiscount" type="number" min="0" max="100" inputmode="numeric" value="${s.payoffDiscount ?? 15}"></label>
        <label class="field" style="flex:1 1 120px">Interest on overdue balances (% a year) <span class="hint">After 30 days overdue · Alabama allows up to 8 in a written contract · 0 = none</span><input name="interestRate" type="number" min="0" max="8" step="0.5" inputmode="decimal" value="${s.interestRate ?? 8}"></label>
        <label class="field" style="flex:1 1 120px">Reinstatement fee ($) <span class="hint">To put a site back online after non-payment · 0 = none</span><input name="reinstatementFee" type="number" min="0" max="500" step="0.01" inputmode="decimal" value="${s.reinstatementFee ?? 49}"></label>
        <label class="check" style="flex:1 1 100%"><input type="checkbox" name="invoiceForAll"${s.invoiceForAll !== false ? " checked" : ""}> Offer “Pay by check or bank transfer (we'll send an invoice)” to every client, not only churches</label>
        <label class="field" style="flex:1 1 120px">Returned payment / dispute fee ($) <span class="hint">A bank debit that bounces or a charge they dispute · 0 = none</span><input name="returnedPaymentFee" type="number" min="0" max="100" step="0.01" inputmode="decimal" value="${s.returnedPaymentFee ?? 15}"></label>
        <h3 style="flex-basis:100%;margin:10px 0 0">🎁 Discounts</h3>
        <label class="field" style="flex:1 1 120px">Founding-customer spots <span class="hint">The first N paying clients pick one extra free (tick "Founder pick" on the extras below) · 0 = off</span><input name="founderSlots" type="number" min="0" max="1000" inputmode="numeric" value="${s.founderSlots ?? 5}"></label>
        <label class="field" style="flex:1 1 120px">Referral: months free <span class="hint">Per business a client refers, once its first payment is in · 0 = program off</span><input name="referralMonths" type="number" min="0" max="12" inputmode="numeric" value="${s.referralMonths ?? 2}"></label>
        <label class="field" style="flex:1 1 120px">Referral: max per year <span class="hint">Credits that count in each year of their service; the rest bank for later years</span><input name="referralMaxPerYear" type="number" min="0" max="24" inputmode="numeric" value="${s.referralMaxPerYear ?? 2}"></label>
        <label class="field" style="flex:1 1 120px">Referral: minimum plan (months) <span class="hint">The referred business must take a plan this long (6 = the 6- or 12-month plan or yearly; month to month never counts)</span><input name="referralMinMonths" type="number" min="1" max="24" inputmode="numeric" value="${s.referralMinMonths ?? 6}"></label>
      </div>
      <section class="card" style="margin-top:14px"><h2>📄 Preview the agreement</h2>
        <p class="small muted">See the exact agreement a client would sign with the numbers above. Uses what's saved, so tap Save first after changing anything.</p>
        <div class="row" style="flex-wrap:wrap">
          <label class="field" style="flex:1 1 140px">Plan<select data-prev-plan>${(s.plans || []).filter((p) => p.monthly).map((p) => `<option value="${esc(p.id)}"${p.id === "plus" ? " selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label>
          <label class="field" style="flex:1 1 160px">Way to pay<select data-prev-billing>${[["standard", `${s.minMonths ?? 12}-month plan`], ["short", `${s.shortMonths ?? 6}-month plan`], ["flex", "Month to month"], ["annual", "Pay yearly"], ["invoice", "Pay by invoice (churches)"]].filter(([id]) => (id !== "short" || s.shortMonths) && (id !== "flex" || s.flexSetup) && (id !== "annual" || s.annualMonthsFree)).map(([id, label]) => `<option value="${id}">${esc(label)}</option>`).join("")}</select></label>
        </div>
        <div class="btns btns--full"><a class="btn btn--primary" data-prev-show href="/api/contract?plan=plus" target="_blank" rel="noopener">Show the example agreement</a><a class="btn" data-prev-pdf href="/api/contract.pdf?plan=plus">⬇ Download as PDF</a></div>
        <p class="small muted" style="margin-top:10px">Also: <a href="/api/ach.pdf">⬇ Blank payment authorization form (ACH debit or card, PDF)</a> for clients who pay by invoice or want a paper authorization on file. Bank and card numbers go on the paper and into Stripe, never into this app.</p>
      </section>
      <div class="row" style="flex-wrap:wrap">
        <label class="field" style="flex:1 1 120px">Churches &amp; nonprofits: yearly months free <span class="hint">4 = 12 months for the price of 8</span><input name="churchAnnualMonthsFree" type="number" min="0" max="6" inputmode="numeric" value="${s.churchAnnualMonthsFree ?? 4}"></label></div>
        <h2 style="margin-top:18px">Extras</h2>
        <p class="small muted">Shown on the sign-up page, the website and in call guides. Leave a name blank to remove it. "Inventory add-ons" are listed together as the live price list's pieces. "🎁 Founder pick" marks an extra the first clients may choose free (Discounts, above).</p>
        ${[...s.addons, { name: "", price: "", unit: "one-time" }].map((a, i) => `<div class="addon"><div class="row"><label class="field" style="flex:2"><span class="sr-only">Extra ${i + 1}</span><input name="addon_${i}_name" value="${esc(a.name)}" placeholder="New extra" maxlength="60"></label>
          <label class="field"><span class="sr-only">Price</span><input name="addon_${i}_price" type="number" min="0" inputmode="decimal" value="${a.price}" placeholder="$"></label>
          <label class="field"><span class="sr-only">Per</span><select name="addon_${i}_unit">${Object.entries(UNIT_LABEL).map(([k, v]) => `<option value="${k}"${a.unit === k ? " selected" : ""}>${k === "quote" ? "quote per job" : v.trim().replace("/", "per ")}</option>`).join("")}</select></label>
          <label class="field"><span class="sr-only">Group</span><select name="addon_${i}_group" title="Where it is listed"><option value="general"${a.name && addonGroup(a) !== "inventory" ? " selected" : ""}>Extras</option><option value="inventory"${a.name && addonGroup(a) === "inventory" ? " selected" : ""}>Inventory add-ons</option></select></label>
          <label class="check" style="flex:1 1 150px" title="Founding customers pick one of the ticked extras free (one-time or per-item extras only)"><input type="checkbox" name="addon_${i}_founder"${a.founderPick ? " checked" : ""}> 🎁 Founder pick</label></div>
          <label class="field"><span class="sr-only">What they get</span><input name="addon_${i}_about" value="${esc(a.about || "")}" placeholder="One sentence on what they get" maxlength="200"></label>
          ${a.name ? `<details class="more"><summary>Contract terms for this extra</summary><label class="field"><span class="sr-only">Contract terms</span><textarea name="addon_${i}_terms" rows="4" maxlength="1500">${esc(a.terms || (meta.extraTerms || [])[i] || "")}</textarea></label><p class="small muted">Shown in the agreement customers sign when they pick this extra.</p></details>` : `<input type="hidden" name="addon_${i}_terms" value="">`}</div>`).join("")}
        <h2 style="margin-top:18px">Team goals &amp; commission</h2>
        <label class="field">Daily call goal per person <span class="hint">Shows as a progress bar on the Up next card. 0 = off</span><input name="dailyCalls" type="number" min="0" max="500" inputmode="numeric" value="${s.dailyCalls ?? ""}"></label>
        ${(() => { const R = Object.assign({ bonusMonths: 1, setupPct: 20, oneTimePct: 20, quotePct: 20, residualPct: 10, residualCapMonths: 24, openerPct: 40, openerDays: 30, clawbackDays: 60, ownerEarns: false, teamPoolPct: 15 }, s.commissionPlan || {}); const num = (k, label, hint, step = "1") => `<label class="field">${label} <span class="hint">${hint}</span><input name="cp_${k}" type="number" min="0" step="${step}" inputmode="decimal" value="${R[k]}"></label>`;
          return `<h3 style="margin:14px 0 4px">Commission</h3><p class="small muted">What everyone earns on a sale. The <a href="#/commission">💰 Commission calculator</a> shows any combination with these numbers.</p>
          <div class="row">${num("bonusMonths", "Up-front bonus (months of the price)", "On the plan and monthly extras", "0.5")}${num("residualPct", "Each later payment (%)", "Plan + monthly extras")}</div>
          <div class="row">${num("residualCapMonths", "Later payments stop after (months)", "0 = never stop")}${num("setupPct", "Month-to-month setup fee (%)", "Paid up front")}</div>
          <div class="row">${num("oneTimePct", "One-time & per-item extras (%)", "Paid up front")}${num("quotePct", "Priced-per-job extras (%)", "Of what we charge")}</div>
          <div class="row">${num("openerPct", "Opener's share of the up-front money (%)", "The closer gets the rest + later payments")}${num("openerDays", "A lead stays the opener's for (days)", "After their last logged contact")}</div>
          <div class="row">${num("clawbackDays", "Clawback window (days)", "Cancel or refund inside it = bonus comes back")}${num("teamPoolPct", "Team pool (% of what clients pay)", "Pays the office staff")}</div>
          <label class="check"><input type="checkbox" name="cp_ownerEarns"${R.ownerEarns ? " checked" : ""}> The owner earns commission on their own sales (off = the owner's share stays in the company)</label>`; })()}
        <label class="field">Client agreement <span class="hint">Plain-language starting point, not legal advice. Have a lawyer look it over once.</span><textarea name="terms" rows="10">${esc(s.terms || meta.defaultTerms)}</textarea></label>
        <button class="btn btn--small" type="button" id="resetterms">Reset agreement to the standard text</button>
        <h2 style="margin-top:18px">Runs</h2>
        <label class="field">Default most sites per run<input name="cap" type="number" min="1" max="500" value="${s.defaultCap}"></label>
        <label class="field">AI writer<select name="model">${meta.models.map((m) => `<option value="${esc(m.id)}"${m.id === s.copyModel ? " selected" : ""}>${esc(m.label)}</option>`).join("")}</select></label>
        <div class="sticky-save"><button class="btn btn--primary" type="submit" style="width:100%">Save settings</button></div></form>
      <section class="card"><h2>Spending, last 30 days</h2><p class="small muted">The full picture, every service we pay for, this month's usage and renewals: <a href="#/costs">💵 Costs &amp; usage</a>.</p><ul class="list">
        <li>AI writing: <strong>$${u.aiCost.toFixed(2)}</strong> <span class="muted small">(${u.aiTokensIn.toLocaleString()} in / ${u.aiTokensOut.toLocaleString()} out tokens)</span></li>
        <li>Google: about <strong>$${u.googleCostEstimate.toFixed(2)}</strong> <span class="muted small">(${u.googleRequests} searches, ${u.googlePhotos} photos; estimate, before Google's free monthly credit)</span></li></ul></section>
      ${aiKeyCard()}
      ${callersCard(callers)}
      ${deviceCard()}
    </div>`;
    collapsibleSections();
    settingsJumpChips();
    loadHealth();
    loadProblems();
    bindCallers();
    bindDevice();
    bindAiKey();
    $app.querySelector("#resetterms").addEventListener("click", () => {
      if (confirm("Replace the agreement with the standard text?")) $app.querySelector("[name=terms]").value = meta.defaultTerms;
    });
    $app.querySelector("#sf").addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const f = e.target;
        const v = (n) => f.elements[n].value.trim();
        // Blank = null = "clear it" (the server keeps anything the form leaves out, so blanks must say so).
        const n = (x) => (x === "" ? null : Number(x));
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
          if (name) addons.push({ name, price: Number(v(`addon_${i}_price`) || 0), unit: f.elements[`addon_${i}_unit`].value, group: f.elements[`addon_${i}_group`] ? f.elements[`addon_${i}_group`].value : undefined, about: v(`addon_${i}_about`) || undefined, terms: v(`addon_${i}_terms`) || undefined, founderPick: f.elements[`addon_${i}_founder`] && f.elements[`addon_${i}_founder`].checked ? true : undefined });
        }
        if (plans.some((p) => !p.monthly)) return toast("Give every plan a monthly price");
        const terms = v("terms");
        await api("/settings", {
          method: "PUT",
          json: {
            defaultCap: Number(f.cap.value),
            copyModel: f.model.value,
            companyName: v("companyName") || null,
            legalName: v("legalName") || null,
            companyPhone: v("companyPhone") || null,
            companyEmail: v("companyEmail") || null,
            billingEmail: v("billingEmail") || "",
            supportEmail: v("supportEmail") || "",
            googleClientId: v("googleClientId") || null,
            googleDomain: v("googleDomain").toLowerCase() || null,
            ownerEmail: v("ownerEmail").toLowerCase() || null,
            requireGoogle: f.requireGoogle.checked,
            fcmAppId: v("fcmAppId") || null,
            fcmApiKey: v("fcmApiKey") || null,
            fcmProjectId: v("fcmProjectId") || null,
            fcmSenderId: v("fcmSenderId") || null,
            stripePublishableKey: v("stripePublishableKey") || null,
            companyStreet: v("companyStreet") || null,
            companyCity: v("companyCity") || null,
            companyState: v("companyState").toUpperCase() || null,
            companyZip: v("companyZip") || null,
            directEmail: v("directEmail") || null,
            siteHeadline: v("siteHeadline") || null,
            siteLead: v("siteLead") || null,
            siteBio: v("siteBio") || null,
            siteTestimonials: v("siteTestimonials") || null,
            siteTowns: v("siteTowns") || null,
            turnstileSiteKey: v("turnstileSiteKey") || null,
            gaAccountId: v("gaAccountId") || null,
            companyReviewUrl: v("companyReviewUrl") || null,
            companyFacebookUrl: v("companyFacebookUrl") || null,
            gaMeasurementId: v("gaMeasurementId").toUpperCase() || null,
            calendarEmail: v("calendarEmail") || null,
            gbpEmail: v("gbpEmail") || null,
            // Only the owner's own login shows this field; others keep the owner's name as it is.
            callerName: f.elements.callerName ? v("callerName") || null : s.callerName,
            plans,
            minMonths: n(v("minMonths")),
            shortMonths: n(v("shortMonths")),
            flexSetup: n(v("flexSetup")),
            lateFee: n(v("lateFee")),
            payoffDiscount: n(v("payoffDiscount")),
            interestRate: n(v("interestRate")),
            reinstatementFee: n(v("reinstatementFee")),
            returnedPaymentFee: n(v("returnedPaymentFee")),
            founderSlots: n(v("founderSlots")),
            referralMonths: n(v("referralMonths")),
            referralMaxPerYear: n(v("referralMaxPerYear")),
            referralMinMonths: n(v("referralMinMonths")),
            invoiceForAll: !!(f.elements.invoiceForAll && f.elements.invoiceForAll.checked),
            annualMonthsFree: n(v("annualMonthsFree")),
            churchAnnualMonthsFree: n(v("churchAnnualMonthsFree")),
            dailyCalls: n(v("dailyCalls")),
            addons,
            commissionPlan: Object.fromEntries([...["bonusMonths", "residualPct", "residualCapMonths", "setupPct", "oneTimePct", "quotePct", "openerPct", "openerDays", "clawbackDays", "teamPoolPct"].map((k) => [k, Number(v("cp_" + k) || 0)]), ["ownerEarns", f.elements.cp_ownerEarns.checked]]),
            terms: terms && terms !== meta.defaultTerms ? terms : null,
          },
        });
        meta = null;
        toast("Saved");
      } catch (err) { toast(err.message); }
    });
  }

  /* ---------- notifications ---------- */
  const NOTIF_ICON = { problem: "🐞", costs: "💵", note: "📝", call: "📞", status: "🏷️", signup_sent: "📨", signed: "✍️", paid: "💵", published: "🚀", added: "➕", message: "💬", run: "🔎", preview_open: "👀", task: "📝", clock: "⏱" };

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

  // A new deploy while the app is open: an installed web app can stay loaded for days, so it watches /app.js's ETag
  // (a HEAD request every 5 minutes and whenever it comes back to the front). When it changes, a bar offers a reload
  // and the next screen change reloads by itself (never in the middle of an unsaved edit).
  let appEtag = null;
  let updateReady = false;
  async function checkForUpdate() {
    try {
      const res = await fetch("/app.js", { method: "HEAD", cache: "no-store" });
      const tag = res.headers.get("etag");
      if (!tag) return;
      if (appEtag === null) { appEtag = tag; return; }
      if (tag !== appEtag && !updateReady) {
        updateReady = true;
        const bar = document.createElement("div");
        bar.id = "update-bar";
        bar.setAttribute("role", "status");
        bar.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:60;background:#14213d;color:#fff;padding:12px 16px;display:flex;gap:12px;align-items:center;justify-content:center;font-size:.95rem";
        bar.innerHTML = `<span>A new version of the app is ready.</span><button class="btn btn--small" type="button" style="background:#fca311;color:#14213d;border:0">Reload now</button>`;
        bar.querySelector("button").onclick = () => location.reload();
        document.body.appendChild(bar);
      }
    } catch (e) { /* offline */ }
  }
  checkForUpdate();
  setInterval(() => { if (!document.hidden) checkForUpdate(); }, 300000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) checkForUpdate(); });

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


  /* ---------- tasks ---------- */
  const TASK_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  /** "Today 2:30 PM", "Tomorrow", "Tue Oct 14", or "" for undated tasks. */
  function taskWhen(t) {
    if (!t.due) return "";
    const today = dayFromNow(0), tomorrow = dayFromNow(1);
    const d = new Date(t.due + "T12:00:00");
    let day = t.due === today ? "Today" : t.due === tomorrow ? "Tomorrow" : `${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()]} ${TASK_MONTHS[d.getMonth()]} ${d.getDate()}`;
    if (t.dueTime) {
      const [h, m] = t.dueTime.split(":").map(Number);
      day += ` ${h % 12 || 12}${m ? ":" + String(m).padStart(2, "0") : ""} ${h >= 12 ? "PM" : "AM"}`;
    }
    return day;
  }
  const taskGroup = (t) => (!t.due ? "later" : t.due < dayFromNow(0) ? "overdue" : t.due === dayFromNow(0) ? "today" : "upcoming");
  const TASK_GROUPS = [["overdue", "Overdue"], ["today", "Today"], ["upcoming", "Coming up"], ["later", "No date"]];
  const canDeleteTask = (t) => isOwner() || t.createdBy === meta.me.id;

  function taskLi(t, full) {
    const g = taskGroup(t);
    const done = !!t.doneAt;
    const ids = taskWho(t);
    const who = ids.length ? ids.map((id, i) => (id === meta.me.id ? "You" : (t.assigneeNames || [])[i] || t.assigneeName)).join(", ") : "Anyone";
    const meta2 = [
      t.due ? `<span class="chip${g === "overdue" && !done ? " chip--warn" : ""}">${esc(taskWhen(t))}</span>` : "",
      `<span class="small muted">${esc(who)}</span>`,
      t.leadName ? `<a class="small" href="#/lead/${t.leadId}">${esc(t.leadName)}</a>` : "",
      full && t.createdByName && t.createdBy !== meta.me.id ? `<span class="small muted">from ${esc(t.createdByName)}</span>` : "",
      done && t.doneByName ? `<span class="small muted">done by ${esc(t.doneByName)}</span>` : "",
      t.onCalendar ? `<span class="small muted" title="On the calendar">📅</span>` : "",
    ].filter(Boolean).join("");
    return `<li class="task${done ? " task--done" : ""}" data-task="${t.id}">
      <button type="button" class="task__check" data-done="${done ? "0" : "1"}" aria-label="${done ? "Not done" : "Mark done"}">${done ? "↩" : "✓"}</button>
      <div class="task__body"><button type="button" class="task__title" data-edit>${esc(t.title)}</button>
        ${t.notes && full ? `<p class="small" style="margin:2px 0 0;white-space:pre-wrap">${esc(t.notes)}</p>` : ""}
        <div class="task__meta">${meta2}</div></div>
      ${full && canDeleteTask(t) ? `<button type="button" class="task__del" data-del aria-label="Delete task">×</button>` : ""}
    </li>`;
  }

  /** Home card: what's overdue or due today (yours, or unassigned), plus a link to everything. */
  function tasksHomeHtml(tasks) {
    const mine = tasks.filter((t) => (!taskWho(t).length || taskWho(t).includes(meta.me.id)) && t.due && t.due <= dayFromNow(0));
    const others = tasks.length - mine.length;
    if (!mine.length) return tasks.length ? `<p class="small muted" style="margin:-6px 0 12px"><a href="#/tasks">📝 ${tasks.length} open task${tasks.length === 1 ? "" : "s"}</a></p>` : "";
    return `<section class="card due"><h2>📝 Tasks: ${mine.length} for today</h2>
      <ul class="list">${mine.slice(0, 6).map((t) => taskLi(t, false)).join("")}</ul>
      <p class="small" style="margin:8px 0 0"><a href="#/tasks">All tasks${others ? ` (${others} more)` : ""}</a> · <a href="#/tasks">Add one</a></p></section>`;
  }

  /** Wires the ✓ / ↩ buttons in any task list; `after` re-renders. */
  function bindTaskChecks(root, after) {
    root.querySelectorAll("[data-done]").forEach((b) => b.addEventListener("click", async () => {
      const id = b.closest("[data-task]").dataset.task;
      b.disabled = true;
      try { await api(`/tasks/${id}`, { method: "PUT", json: { done: b.dataset.done === "1" } }); after(); } catch (err) { toast(err.message); b.disabled = false; }
    }));
  }

  // A task can be for several people (Oct 2026); older servers sent only `assignee`.
  const taskWho = (t) => (t.assignees ? t.assignees : t.assignee ? [t.assignee] : []);
  function taskFormHtml(t, leadName) {
    const picked = taskWho(t);
    const team = (meta.team || []).map((p) => `<label class="chipbox"><input type="checkbox" name="assignees" value="${esc(p.id)}"${picked.includes(p.id) ? " checked" : ""}> ${esc(p.id === meta.me.id ? `${p.name} (me)` : p.name)}</label>`).join("");
    return `<form class="taskform" data-task-form="${esc(t.id || "")}">
      <label class="field"><span class="sr-only">Task</span><input name="title" required maxlength="200" placeholder="What needs doing?" value="${esc(t.title || "")}" autocomplete="off"></label>
      <div class="row">
        <label class="field">When<input name="due" type="date" value="${esc(t.due || "")}"></label>
        <label class="field">Time<input name="dueTime" type="time" value="${esc(t.dueTime || "")}"></label>
      </div>
      ${team ? `<fieldset class="field taskfor"><legend>For <span class="hint">tick everyone it's for; none = anyone</span></legend><div class="chipboxes">${team}</div></fieldset>` : ""}
      <label class="field"><span class="sr-only">Notes</span><textarea name="notes" rows="2" maxlength="2000" placeholder="Notes (optional)" style="min-height:48px">${esc(t.notes || "")}</textarea></label>
      ${leadName ? `<p class="small muted">About: <strong>${esc(leadName)}</strong></p>` : ""}
      <div class="btns"><button class="btn btn--primary" type="submit">${t.id ? "Save" : "Add task"}</button>${t.id ? `<button class="btn" type="button" data-cancel>Cancel</button>` : ""}</div>
    </form>`;
  }
  const taskFormValues = (f) => ({
    title: f.title.value.trim(),
    // A time picked without a date means today (it used to be dropped silently).
    due: f.due.value || (f.dueTime.value ? dayFromNow(0) : null),
    dueTime: f.dueTime.value || null,
    assignees: [...f.querySelectorAll("[name=assignees]:checked")].map((x) => x.value),
    notes: f.notes.value.trim(),
  });

  async function viewTasks(leadId) {
    setNav("tasks");
    const my = renderSeq;
    meta = meta || (await api("/meta"));
    const state = { scope: "open", mine: false, leadId: leadId || null, leadName: null };
    if (state.leadId) {
      try { const l = await api("/leads/" + state.leadId); state.leadName = l.record ? l.record.name : l.name; } catch (e) { state.leadId = null; }
    }
    if (stale(my)) return;
    $app.innerHTML = `<p><a href="${state.leadId ? `#/lead/${state.leadId}` : "#/"}" id="back">← ${state.leadId ? "Lead" : "Home"}</a></p>
      <h1>Tasks${state.leadName ? `: ${esc(state.leadName)}` : ""}</h1>
      ${state.leadId ? "" : `<div id="clockbox"></div>`}
      <section class="card"><h2>Add a task</h2>${taskFormHtml({ assignee: state.leadId ? "" : "" }, state.leadName)}
        <p class="small muted" style="margin:6px 0 0">${isOwner() ? "Tasks for you with a date go to your calendar as invites." : "The owner sees these on their home screen; dated tasks for the owner go to their calendar."}</p></section>
      <div class="tabs" role="tablist">
        <button type="button" data-scope="open" class="is-on">Open</button><button type="button" data-scope="done">Done</button>
        <button type="button" data-mine="1">Mine</button></div>
      <ul class="list" id="tasklist"><li class="muted">Loading…</li></ul>`;
    const listEl = $app.querySelector("#tasklist");
    const form = $app.querySelector("[data-task-form]");

    async function load() {
      const q = new URLSearchParams({ scope: state.scope });
      if (state.mine) q.set("mine", "1");
      if (state.leadId) q.set("lead", state.leadId);
      let tasks;
      try { ({ tasks } = await api("/tasks?" + q)); } catch (err) { listEl.innerHTML = `<li class="card offline"><p>${esc(err.message)}</p></li>`; return; }
      if (stale(my)) return;
      if (!tasks.length) {
        listEl.innerHTML = `<li class="muted">${state.scope === "done" ? "Nothing finished yet." : state.mine ? "Nothing on your list. Add one above." : "No open tasks. Add one above."}</li>`;
        return;
      }
      if (state.scope === "done") listEl.innerHTML = tasks.map((t) => taskLi(t, true)).join("");
      else {
        listEl.innerHTML = TASK_GROUPS.map(([k, label]) => {
          const rows = tasks.filter((t) => taskGroup(t) === k);
          return rows.length ? `<li class="tasks__group" aria-hidden="true">${label}</li>${rows.map((t) => taskLi(t, true)).join("")}` : "";
        }).join("");
      }
      bindTaskChecks(listEl, load);
      listEl.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => {
        if (!confirm("Delete this task?")) return;
        try { await api(`/tasks/${b.closest("[data-task]").dataset.task}`, { method: "DELETE" }); load(); } catch (err) { toast(err.message); }
      }));
      listEl.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => {
        const li = b.closest("[data-task]");
        const t = tasks.find((x) => x.id === li.dataset.task);
        li.innerHTML = `<div class="task__body">${taskFormHtml(t, t.leadName)}</div>`;
        const f = li.querySelector("form");
        f.querySelector("[data-cancel]").addEventListener("click", load);
        f.addEventListener("submit", async (e) => {
          e.preventDefault();
          try { await api(`/tasks/${t.id}`, { method: "PUT", json: taskFormValues(f) }); toast("Saved"); load(); } catch (err) { toast(err.message); }
        });
        f.title.focus();
      }));
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const v = taskFormValues(form);
      if (!v.title) return toast("Give the task a name");
      const btn = form.querySelector("button[type=submit]");
      btn.disabled = true;
      try {
        await api("/tasks", { method: "POST", json: { ...v, leadId: state.leadId } });
        form.reset();
        toast("Task added");
        if (state.scope !== "open") { state.scope = "open"; $app.querySelectorAll("[data-scope]").forEach((x) => x.classList.toggle("is-on", x.dataset.scope === "open")); }
        load();
      } catch (err) { toast(err.message); } finally { btn.disabled = false; }
    });
    $app.querySelectorAll("[data-scope]").forEach((b) => b.addEventListener("click", () => {
      state.scope = b.dataset.scope;
      $app.querySelectorAll("[data-scope]").forEach((x) => x.classList.toggle("is-on", x === b));
      load();
    }));
    const mineBtn = $app.querySelector("[data-mine]");
    mineBtn.addEventListener("click", () => { state.mine = !state.mine; mineBtn.classList.toggle("is-on", state.mine); load(); });
    const clockBox = $app.querySelector("#clockbox");
    if (clockBox) loadClock(clockBox, my);
    await load();
  }

  /* ---------- time clock ---------- */
  // Hourly team members clock in and out at the top of Tasks; the owner / full access see everyone's week in Timesheets.
  const hm = (min) => `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;
  const clockTime = (ms) => new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const clockDay = (day) => { const d = new Date(day + "T12:00:00"); return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }); };
  const cents = (c) => "$" + (c / 100).toFixed(2);

  function clockCardHtml(st) {
    const timesheets = isOwner() ? `<a class="btn btn--small" href="#/timesheet">🗂️ Timesheets</a>` : "";
    if (!st.canClock) return isOwner() ? `<section class="card"><h2>⏱ Time clock</h2><p class="small muted">Set someone's hourly pay in Settings → Team and they get a Clock in button here. Everyone's hours are in Timesheets.</p><div class="btns">${timesheets}</div></section>` : "";
    const o = st.open;
    const week = `This week: <strong>${hm(st.week.minutes)}</strong>${st.week.payCents ? ` · about ${cents(st.week.payCents)}` : ""}`;
    return `<section class="card${o ? " card--client" : ""}"><h2>⏱ ${o ? "You're on the clock" : "Time clock"}</h2>
      ${o ? `<p style="font-size:1.6rem;font-weight:800;margin:4px 0" data-clock-since="${o.clockIn}">${hm(o.minutes)}</p>
        <p class="small muted" style="margin:0 0 8px">Since ${clockTime(o.clockIn)}${o.note ? ` · ${esc(o.note)}` : ""}</p>`
        : `<p class="small muted" style="margin:0 0 8px">Today: ${hm(st.today.minutes)} · ${week}</p>`}
      <label class="field"><span class="sr-only">Note</span><input id="clocknote" maxlength="300" placeholder="${o ? "What you got done (optional)" : "What you're working on (optional)"}"></label>
      <div class="btns"><button class="btn btn--primary" type="button" id="clockbtn" style="flex:1">${o ? "⏹ Clock out" : "▶ Clock in"}</button>${timesheets}</div>
      ${o ? `<p class="small muted" style="margin:8px 0 0">${week}</p>` : ""}
      ${st.entries.length ? `<details style="margin-top:8px"><summary class="small">My hours, this week and last</summary><ul class="list">${st.entries.map((e) => `<li class="small"><strong>${clockDay(e.day)}</strong> ${clockTime(e.clockIn)} – ${e.clockOut ? clockTime(e.clockOut) : "now"} · ${hm(e.minutes)}${e.note ? ` · ${esc(e.note)}` : ""}${e.editedBy ? ` <span class="muted">(fixed by ${esc(e.editedBy)})</span>` : ""}</li>`).join("")}</ul></details>` : ""}
    </section>`;
  }

  async function loadClock(box, my) {
    let st;
    try { st = await api("/clock"); } catch (e) { box.innerHTML = ""; return; }
    if (stale(my)) return;
    box.innerHTML = clockCardHtml(st);
    const btn = box.querySelector("#clockbtn");
    if (btn) btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        const r = await api(st.open ? "/clock/out" : "/clock/in", { method: "POST", json: { note: box.querySelector("#clocknote").value.trim() || undefined } });
        toast(st.open ? `Clocked out: ${hm(r.entry.minutes)}` : "Clocked in");
        loadClock(box, my);
      } catch (err) { toast(err.message); btn.disabled = false; }
    });
    const since = box.querySelector("[data-clock-since]");
    if (since) {
      const tick = setInterval(() => {
        if (stale(my) || !document.body.contains(since)) return clearInterval(tick);
        since.textContent = hm(Math.max(0, Math.round((Date.now() - Number(since.dataset.clockSince)) / 60000)));
      }, 20000);
    }
  }

  const todayStr = () => dayFromNow(0);
  function shiftFormHtml(e, people) {
    const d = (ms) => (ms ? new Date(ms) : null);
    const ymd = (x) => (x ? `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}` : "");
    const hhmm = (x) => (x ? `${String(x.getHours()).padStart(2, "0")}:${String(x.getMinutes()).padStart(2, "0")}` : "");
    const i = d(e && e.clockIn), o = d(e && e.clockOut);
    return `<form class="shiftform" data-shift="${e ? e.id : ""}">
      ${people ? `<label class="field">Who<select name="userId" required>${people.map((p) => `<option value="${esc(p.userId)}">${esc(p.name)}</option>`).join("")}</select></label>` : ""}
      <div class="row">
        <label class="field">Date<input name="inDay" type="date" required value="${ymd(i) || todayStr()}"></label>
        <label class="field">Clock in<input name="inTime" type="time" required value="${hhmm(i)}"></label>
        <label class="field">Clock out<input name="outTime" type="time" value="${hhmm(o)}" ${people ? "required" : ""}></label>
      </div>
      <label class="check small"><input type="checkbox" name="nextDay"${o && ymd(o) !== ymd(i) ? " checked" : ""}> Clocked out the next day (past midnight)</label>
      <label class="field"><span class="sr-only">Note</span><input name="note" maxlength="300" placeholder="Note (optional)" value="${esc((e && e.note) || "")}"></label>
      <div class="btns"><button class="btn btn--primary" type="submit">${e ? "Save" : "Add shift"}</button>${e ? `<button class="btn" type="button" data-cancel>Cancel</button><button class="btn btn--danger" type="button" data-delshift>Delete</button>` : ""}</div>
    </form>`;
  }
  const shiftValues = (f) => {
    const outDay = f.outTime.value && f.nextDay.checked ? (() => { const x = new Date(f.inDay.value + "T12:00:00"); x.setDate(x.getDate() + 1); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; })() : null;
    return { inDay: f.inDay.value, inTime: f.inTime.value, outDay, outTime: f.outTime.value || null, note: f.note.value.trim() || null, ...(f.userId ? { userId: f.userId.value } : {}) };
  };

  async function viewTimesheet(week) {
    setNav("tasks");
    const my = renderSeq;
    meta = meta || (await api("/meta"));
    if (!isOwner()) { $app.innerHTML = `<p><a href="#/tasks">← Tasks</a></p><section class="card"><p>Only the owner and full-access team members see timesheets.</p></section>`; return; }
    let w;
    try { w = await api("/clock/team" + (week ? `?week=${week}` : "")); } catch (err) { $app.innerHTML = `<p><a href="#/tasks">← Tasks</a></p><section class="card offline"><p>${esc(err.message)}</p></section>`; return; }
    if (stale(my)) return;
    const shift = (day, n) => { const x = new Date(day + "T12:00:00"); x.setDate(x.getDate() + n); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
    const thisWeek = w.from <= todayStr() && todayStr() <= w.to;
    $app.innerHTML = `<p><a href="#/tasks">← Tasks</a></p>
      <h1>🗂️ Timesheets</h1>
      <div class="btns" style="align-items:center"><a class="btn btn--small" href="#/timesheet/${shift(w.from, -7)}">← Week before</a>
        <strong style="flex:1;text-align:center">${clockDay(w.from)} – ${clockDay(w.to)}${thisWeek ? " (this week)" : ""}</strong>
        ${thisWeek ? "" : `<a class="btn btn--small" href="#/timesheet/${shift(w.from, 7)}">Week after →</a>`}</div>
      <section class="card"><h2>Everyone: ${hm(w.totalMinutes)} · ${cents(w.totalPayCents)}</h2>
        <p class="small muted">Hourly pay only (commission is on Sales). A shift counts on the day it started. Set or change pay in Settings → Team; a change applies to shifts started after it.</p>
        <div class="btns"><a class="btn" href="/api/clock/team.csv?week=${w.from}" download>⬇ Download this week (CSV)</a></div></section>
      ${w.people.length ? w.people.map((p) => `<section class="card"><h2>${esc(p.name)}${p.open ? ` <span class="chip chip--good">On the clock</span>` : ""}</h2>
        <p class="small muted" style="margin:0 0 6px">${hm(p.minutes)}${p.hourlyCents ? ` · ${cents(p.hourlyCents)}/hr · ${cents(p.payCents)}` : " · no hourly pay set"}</p>
        <ul class="list">${p.entries.length ? p.entries.map((e) => `<li data-entry="${e.id}"><div class="row"><span><strong>${clockDay(e.day)}</strong> ${clockTime(e.clockIn)} – ${e.clockOut ? clockTime(e.clockOut) : "<em>still on</em>"} · ${hm(e.minutes)}${e.payCents ? ` · ${cents(e.payCents)}` : ""}</span><button class="btn btn--small" type="button" data-editshift>Fix</button></div>
          ${e.note || e.editedBy ? `<p class="small muted" style="margin:2px 0 0">${esc(e.note)}${e.editedBy ? ` (changed by ${esc(e.editedBy)})` : ""}</p>` : ""}</li>`).join("") : `<li class="small muted">No shifts this week.</li>`}</ul></section>`).join("")
        : `<section class="card"><p class="muted">Nobody has hourly pay yet. Set it in Settings → Team.</p></section>`}
      ${w.people.length ? `<section class="card"><h2>Add a missed shift</h2>${shiftFormHtml(null, w.people)}</section>` : ""}`;
    const all = w.people.flatMap((p) => p.entries);
    $app.querySelectorAll("[data-editshift]").forEach((b) => b.addEventListener("click", () => {
      const li = b.closest("[data-entry]");
      const e = all.find((x) => x.id === li.dataset.entry);
      li.innerHTML = shiftFormHtml(e, null);
      const f = li.querySelector("form");
      f.querySelector("[data-cancel]").addEventListener("click", () => viewTimesheet(week));
      f.querySelector("[data-delshift]").addEventListener("click", async () => {
        if (!confirm("Delete this shift?")) return;
        try { await api(`/clock/entries/${e.id}`, { method: "DELETE" }); viewTimesheet(week); } catch (err) { toast(err.message); }
      });
      f.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        try { await api(`/clock/entries/${e.id}`, { method: "PUT", json: shiftValues(f) }); toast("Shift saved"); viewTimesheet(week); } catch (err) { toast(err.message); }
      });
    }));
    const add = $app.querySelector(".shiftform[data-shift='']");
    if (add) add.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      try { await api("/clock/entries", { method: "POST", json: shiftValues(add) }); toast("Shift added"); viewTimesheet(week); } catch (err) { toast(err.message); }
    });
  }

  async function viewNotifications() {
    setNav("notifications");
    const my = renderSeq;
    const [data, prefs] = await Promise.all([api("/notifications"), api("/notifications/prefs").catch(() => null)]);
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
      ${prefs ? `<section class="card"><h2>What you get alerted about</h2><div class="checks">${prefs.modes.map((m) => `<label class="check"><input type="radio" name="alertmode" value="${esc(m.id)}"${prefs.mode === m.id ? " checked" : ""}> <strong>${esc(m.label)}</strong> <span class="small muted">${esc(m.about)}</span></label>`).join("")}</div>
        <p class="small muted" style="margin:6px 0 0">Applies to this list, the badge and phone alerts, on the web and in the Android app.</p></section>` : ""}
      <section class="card"><h2>Phone notifications</h2>
        ${!ps.supported ? `<p class="small muted">This browser can't show phone notifications. Use the installed app or Chrome on Android.</p>`
          : on ? `<p class="small">✅ On for this phone. You'll get a notification whenever someone else adds or changes something on a lead.</p><div class="btns"><button class="btn btn--small" id="ptest">Send a test</button><button class="btn btn--small" id="poff">Turn off on this phone</button></div>`
          : `<p class="small muted">Get a notification on this phone when a prospect opens their preview, someone adds a note, logs a call, sets a callback, makes a sale${isOwner() ? ", a client signs up, or a website gets a message" : " or a client signs up"}.</p><button class="btn btn--primary" id="pon">🔔 Turn on phone notifications</button>`}
      </section>
      <ul class="list notifs">${rows || `<li class="muted">Nothing yet. When someone else adds a note, logs a call, sets a callback, makes a sale, or a client signs up, it shows here.</li>`}</ul>
      <p class="small muted">Something in the app didn't work? ${reportBtn("🐞 Report a problem")}</p>`;
    $app.querySelectorAll('input[name="alertmode"]').forEach((r) => r.addEventListener("change", async () => {
      try { await api("/notifications/prefs", { method: "PUT", json: { mode: r.value } }); toast("Saved"); refreshNotifCount(); } catch (err) { toast(err.message); }
    }));
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
    // A newer app.js is on the server (see checkForUpdate): take it now, at a screen change, when nothing is unsaved.
    if (updateReady && lastHash !== null && h !== lastHash && !leaveGuard) { location.reload(); return; }
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
      maybeWhatsNew();
      if (!isOwner() && (h === "#/inbox" || h === "#/sales" || h === "#/costs")) return go("#/");
      if ((m = /^#\/lead\/([a-z0-9]+)(?:\/(text|pay|checklist|publish|review|retry|log))?$/.exec(h))) return await viewLead(m[1], m[2]);
      if ((m = /^#\/edit\/([a-z0-9]+)(?:\/([a-z]+))?$/.exec(h))) return await viewEdit(m[1], m[2]);
      if ((m = /^#\/preview\/([a-z0-9]+)$/.exec(h))) return await viewPreview(m[1]);
      if ((m = /^#\/full\/([a-z0-9]+)(?:\/(es))?$/.exec(h))) return viewFull(m[1], m[2]);
      if ((m = /^#\/pitch\/([a-z0-9]+)$/.exec(h))) return await viewPitch(m[1]);
      if (h === "#/playbook") return await viewPlaybook();
      if (h === "#/commission") return await viewCommission();
      if (h === "#/training") return await viewTraining();
      if (h === "#/changelog") return await viewChangelog();
      if (h === "#/costs") return await viewCosts();
      if ((m = /^#\/guide\/([a-z0-9-]+)$/.exec(h))) return await viewGuide(m[1]);
      if ((m = /^#\/walkin(?:\/([a-z0-9]+))?$/.exec(h))) return await viewWalkin(m[1]);
      if ((m = /^#\/plans(?:\/([a-z0-9]+))?$/.exec(h))) return await viewShowPlans(m[1]);
      if ((m = /^#\/showboard\/([a-z0-9]+)$/.exec(h))) return await viewShowBoard(m[1]);
      if (h === "#/route") return await viewRoute();
      if (h === "#/add") return await viewAdd();
      if (h === "#/run") return await viewRun();
      if ((m = /^#\/gbp\/([a-z0-9]+)$/.exec(h))) return await viewGbp(m[1]);
      if (h === "#/sales") return await viewSales();
      if (h === "#/inbox") return await viewInbox();
      if (h === "#/notifications") return await viewNotifications();
      if ((m = /^#\/tasks(?:\/([a-z0-9]+))?$/.exec(h))) return await viewTasks(m[1]);
      if ((m = /^#\/timesheet(?:\/(\d{4}-\d{2}-\d{2}))?$/.exec(h))) return await viewTimesheet(m[1]);
      if (h === "#/settings") return await viewSettings();
      $app.innerHTML = "";
      return await viewHome();
    } catch (err) {
      if (err.status !== 401) {
        $app.innerHTML = `<div class="card offline"><p>${esc(err.message)}</p><div class="btns"><button class="btn btn--primary" id="reload">Try again</button>${reportBtn("🐞 Report this")}</div></div>`;
        $app.querySelector("#reload").addEventListener("click", () => render());
      }
    }
  }

  /** Events as "date | title | time | details | link" lines (date may be start..end), and back. */
  function eventLines(events) {
    return (events || []).map((e) => [e.endDate ? `${e.date}..${e.endDate}` : e.date, e.title, e.time || "", e.detail || "", e.url || ""].join(" | ").replace(/( \|\s*)+$/, "")).join("\n");
  }
  function parseEventLines(text) {
    const out = [];
    for (const line of text.split("\n")) {
      const parts = line.split("|").map((x) => x.trim());
      if (parts.length < 2 || !parts[1]) continue;
      const m = /^(\d{4}-\d{2}-\d{2})(?:\s*\.\.\s*(\d{4}-\d{2}-\d{2}))?$/.exec(parts[0] || "");
      if (!m) { toast(`Event "${parts[1]}" needs a date like 2026-10-25.`); continue; }
      const e = { title: parts[1].slice(0, 80), date: m[1] };
      if (m[2]) e.endDate = m[2];
      if (parts[2]) e.time = parts[2].slice(0, 40);
      if (parts[3]) e.detail = parts[3].slice(0, 240);
      if (parts[4] && /^https?:\/\//.test(parts[4])) e.url = parts[4];
      out.push(e);
    }
    return out.slice(0, 20);
  }
  /** "~h1n0b2…" from the Edit form's structure pickers, or "" when every pick is the classic one. */
  function dnaCode(f, order) {
    if (!order || !order.length) return "";
    let code = "", any = false;
    for (const k of order) {
      const sel = f.elements["dna_" + k.id];
      const i = sel ? Math.max(0, k.values.findIndex((v) => v.id === sel.value)) : 0;
      code += k.letter + i;
      if (i) any = true;
    }
    return any ? "~" + code : "";
  }
  // Settings → Preview the agreement: the Show / PDF links follow the plan and way-to-pay picks.
  document.addEventListener("change", (e) => {
    if (!e.target.matches || !e.target.matches("[data-prev-plan],[data-prev-billing]")) return;
    const card = e.target.closest("section");
    const plan = card.querySelector("[data-prev-plan]").value, billing = card.querySelector("[data-prev-billing]").value;
    const qs = `plan=${encodeURIComponent(plan)}&billing=${encodeURIComponent(billing)}`;
    card.querySelector("[data-prev-show]").href = `/api/contract?${qs}`;
    card.querySelector("[data-prev-pdf]").href = `/api/contract.pdf?${qs}`;
  });
  // Edit → Design: picking a style sets the structure pickers it cares about; the others stay as they were.
  document.addEventListener("change", (e) => {
    const sel = e.target.closest && e.target.closest("[data-recipe-fill]");
    if (!sel || !sel.value) return;
    const f = sel.closest("form"), opt = sel.selectedOptions[0];
    let dna = {};
    try { dna = JSON.parse((opt && opt.dataset.dna) || "{}"); } catch (err) { dna = {}; }
    if (!f) return;
    for (const [k, v] of Object.entries(dna)) { const el = f.elements["dna_" + k]; if (el) el.value = v; }
    const hero = f.elements.dna_hero, strip = f.elements.dna_strip;
    if (hero && strip) { if (hero.value === "split") strip.value = "none"; else if (strip.value === "none") strip.value = "bar"; }
    toast(`${opt.textContent.split(":")[0]} set. Save to see it.`);
  });
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-act=shuffle]");
    if (!b) return;
    const f = b.closest("form") || $app.querySelector("form");
    if (!f) return;
    for (const sel of f.querySelectorAll("select[name^=dna_]")) sel.selectedIndex = Math.floor(Math.random() * sel.options.length);
    // The split opening carries the address itself, so the address bar goes away with it; otherwise keep one.
    const hero = f.elements.dna_hero, strip = f.elements.dna_strip;
    if (hero && strip) { if (hero.value === "split") strip.value = "none"; else if (strip.value === "none") strip.value = "bar"; }
    toast("New structure picked. Save to see it.");
  });
  addEventListener("hashchange", render);
  addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installPrompt = e; });
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  render();
})();
