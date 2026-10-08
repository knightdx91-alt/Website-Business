"use strict";
(function () {
  const $app = document.getElementById("app");
  const $toast = document.getElementById("toast");
  const $nav = document.getElementById("topnav");
  let meta = null;
  let pollTimer = null;
  let installPrompt = null;
  const filters = { sales: "new", category: "" };

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const telHref = (phone) => "tel:+1" + String(phone || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  const ago = (ms) => {
    const m = Math.round((Date.now() - ms) / 60000);
    if (m < 1) return "just now";
    if (m < 60) return m + " min ago";
    const h = Math.round(m / 60);
    if (h < 24) return h + " hr ago";
    return Math.round(h / 24) + " days ago";
  };
  const CATEGORY_LABEL = { restaurant: "Restaurant", contractor: "Contractor", salon: "Salon", auto: "Auto", landscaping: "Landscaping", cleaning: "Cleaning" };
  const SALES = [["new", "New"], ["callbacks", "Callbacks"], ["shown", "Shown"], ["sold", "Sold"], ["live", "Live"], ["not_interested", "Not interested"], ["", "All"]];
  const OUTCOME_LABEL = { no_answer: "📵 No answer", callback: "📅 Call back", shown: "👍 Interested", sold: "🎉 Sold", not_interested: "✋ Not interested" };
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
  const COST_PER_SITE = { restaurant: 0.04, contractor: 0.1, salon: 0.06, auto: 0.1, landscaping: 0.1, cleaning: 0.1 };
  const MODEL_FACTOR = { "claude-opus-5-5": 1, "claude-sonnet-5-5": 0.5, "claude-haiku-5-5": 0.03 };

  function toast(msg) {
    $toast.textContent = msg;
    $toast.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => ($toast.hidden = true), 3500);
  }

  async function api(path, opts = {}) {
    const init = { method: opts.method || "GET", headers: { "x-wb": "1" }, credentials: "same-origin" };
    if (opts.json !== undefined) {
      init.headers["content-type"] = "application/json";
      init.body = JSON.stringify(opts.json);
    } else if (opts.body) {
      init.headers["content-type"] = opts.type;
      init.body = opts.body;
    }
    const res = await fetch("/api" + path, init);
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
    const per = cats.length ? cats.reduce((s, c) => s + (COST_PER_SITE[c] || 0.08), 0) / cats.length : 0;
    return (per * cap * (MODEL_FACTOR[model] ?? 1)).toFixed(2);
  }

  function runCard() {
    const cap = meta.settings.defaultCap;
    return `<section class="card"><h2>Find leads &amp; build sites</h2>
      <form id="run">
        <p class="muted small">Pick categories, then tap Run. It keeps going in the cloud even if you lock your phone.</p>
        <div class="chips" role="group" aria-label="Categories">${meta.categories
          .map((c, i) => `<label class="pick"><input type="checkbox" name="cat" value="${esc(c.id)}"${i === 0 ? " checked" : ""}>${esc(c.label)}</label>`)
          .join("")}</div>
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
        return `<div><div class="row"><strong>${esc(r.categories.map((x) => CATEGORY_LABEL[x] || x).join(", "))}</strong><span class="muted small" style="text-align:right">${ago(r.createdAt)}</span></div>
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
      ${l.followUp && (l.salesStatus === "new" || l.salesStatus === "shown") ? `<div>${followChip(l.followUp)}</div>` : ""}
      <div class="btns btns--full">
        ${l.status === "ready" ? `<a class="btn btn--small btn--primary" href="#/pitch/${l.id}">📞 Call guide</a>` : `<a class="btn btn--small" href="${telHref(l.phone)}">📞 Call</a>`}
        ${l.status === "ready" ? `<a class="btn btn--small" href="#/preview/${l.id}">Preview</a>` : ""}
        <a class="btn btn--small" href="#/lead/${l.id}">Details</a>
      </div></li>`;
  }

  async function viewHome() {
    setNav("home");
    meta = meta || (await api("/meta"));
    if (!document.getElementById("leads")) {
      $app.innerHTML = `<div class="split"><div>${isOwner() ? runCard() : `<section class="card"><h2>Hi ${esc(meta.me.name)}</h2><p class="muted small">Open a lead's <strong>Call guide</strong> before you call. After each call, log how it went so callbacks show up here on the right day.</p></section>`}<div id="due"></div><div id="runs"></div></div><div><section>
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
        $app.querySelector("#est").textContent = cats.length ? `Up to ${cap} sites. Writing costs about $${estimate(cats, cap)} at most, plus a little for Google searches.` : "Pick at least one category.";
      };
      form.addEventListener("input", updateEst);
      updateEst();
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const cats = [...form.querySelectorAll("input[name=cat]:checked")].map((i) => i.value);
        if (!cats.length) return toast("Pick at least one category");
        const btn = form.querySelector("button");
        btn.disabled = true;
        try {
          await api("/runs", { method: "POST", json: { categories: cats, cap: Number(form.cap.value) } });
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
    await refreshHome();
  }

  async function refreshHome() {
    stopPolling();
    if (!location.hash.match(/^#?\/?$/)) return;
    const q = new URLSearchParams();
    if (filters.sales === "callbacks") q.set("callbacks", "all");
    else if (filters.sales) q.set("sales", filters.sales);
    if (filters.category) q.set("category", filters.category);
    try {
      const [{ runs }, { leads }, { leads: due }] = await Promise.all([
        isOwner() ? api("/runs") : Promise.resolve({ runs: [] }),
        api("/leads?" + q),
        api("/leads?callbacks=due"),
      ]);
      const runsEl = document.getElementById("runs");
      const leadsEl = document.getElementById("leads");
      const dueEl = document.getElementById("due");
      if (!runsEl || !leadsEl) return;
      runsEl.innerHTML = runsHtml(runs);
      dueEl.innerHTML = due.length
        ? `<section class="card due"><h2>📅 Call back today (${due.length})</h2><ul class="list">${due
            .map((l) => `<li><div class="row"><a href="#/lead/${l.id}"><strong>${esc(l.name)}</strong></a>${l.followUp < dayFromNow(0) ? `<span class="chip chip--warn" style="flex:none">Overdue</span>` : ""}</div>
              <div class="btns" style="margin-top:6px"><a class="btn btn--small btn--primary" href="#/pitch/${l.id}">📞 Call guide</a><a class="btn btn--small" href="#/lead/${l.id}">Notes</a></div></li>`)
            .join("")}</ul></section>`
        : "";
      const empty = {
        new: isOwner() ? "No new leads yet. Pick a category and tap Run." : "No new leads right now. Check back after the next run.",
        callbacks: "No callbacks scheduled. Use “Call back…” after a call to schedule one.",
      };
      leadsEl.innerHTML = leads.length ? leads.map(leadCard).join("") : `<li class="card muted">${empty[filters.sales] || "Nothing here yet."}</li>`;
      const busy = runs.some((r) => !r.done) || leads.some((l) => l.status === "queued" || l.status === "building");
      if (busy) pollTimer = setTimeout(refreshHome, 5000);
    } catch (err) {
      if (err.status !== 401) toast(err.message);
    }
  }

  /* ---------- call log ---------- */
  function notesHtml(l, limit) {
    const notes = limit ? l.notes.slice(0, limit) : l.notes;
    if (!notes.length) return `<p class="muted small">No calls logged yet.</p>`;
    const me = meta.me || {};
    return `<ul class="list notes">${notes
      .map((n) => `<li><div class="row"><strong>${esc(n.outcome ? OUTCOME_LABEL[n.outcome] || n.outcome : "📝 Note")}</strong>
        ${!limit && (isOwner() || n.author === me.name) ? `<button class="linkbtn" data-delnote="${n.id}" aria-label="Delete note">Delete</button>` : ""}</div>
        ${n.body ? `<p>${esc(n.body)}</p>` : ""}<p class="small muted">${esc(n.author)} · ${ago(n.createdAt)}</p></li>`)
      .join("")}</ul>`;
  }

  function logCardHtml(l) {
    const current = l.followUp && l.followUp >= dayFromNow(0) ? l.followUp : "";
    return `<section class="card" id="logcard"><h2>Log this call</h2>
      <label class="field">Notes<textarea name="note" rows="3" maxlength="2000" placeholder="Who you talked to, what they said, best time to call…"></textarea></label>
      <div class="field"><span>Call back on <span class="hint">${current ? "Now set for " + esc(dayLabel(current)) : "Not set"}</span></span>
        <div class="chips">${[[1, "Tomorrow"], [3, "In 3 days"], [7, "Next week"]].map(([n, t]) => `<button type="button" class="pick" data-days="${n}">${t}</button>`).join("")}</div>
        <input type="date" name="follow" min="${dayFromNow(0)}" value="${current}"></div>
      <div class="btns btns--full">
        <button class="btn" data-out="no_answer">📵 No answer</button>
        <button class="btn" data-out="callback">📅 Call back</button>
        <button class="btn" data-out="shown">👍 Interested</button>
        <button class="btn btn--good" data-out="sold">🎉 Sold!</button>
        <button class="btn" data-out="not_interested">✋ Not interested</button>
        <button class="btn btn--small" data-out="note">Save note only</button>
      </div>
      <p class="small muted" style="margin-top:10px">No answer schedules a callback for tomorrow unless you pick a day. Sold and Not interested clear the callback. If they ask not to be called again, tap Not interested.</p></section>`;
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
    card.querySelectorAll("[data-out]").forEach((b) => b.addEventListener("click", async () => {
      const outcome = b.dataset.out;
      const note = card.querySelector("[name=note]").value.trim();
      const picked = date.value || null;
      if (outcome === "callback" && !picked) return toast("Pick a day to call back");
      if (outcome === "note" && !note) return toast("Write a note first");
      const payload = { outcome, note };
      if (dirty || outcome === "callback") payload.followUp = picked;
      b.disabled = true;
      try {
        const res = await api(`/leads/${l.id}/log`, { method: "POST", json: payload });
        toast(outcome === "sold" ? "Nice! Marked as sold." : res.followUp ? `Saved. Call back ${dayLabel(res.followUp)}.` : "Saved");
        after();
      } catch (err) { toast(err.message); } finally { b.disabled = false; }
    }));
  }

  function bindNotes(l, after) {
    $app.querySelectorAll("[data-delnote]").forEach((b) => b.addEventListener("click", async () => {
      if (!confirm("Delete this note?")) return;
      try { await api(`/leads/${l.id}/notes/${b.dataset.delnote}`, { method: "DELETE" }); after(); } catch (err) { toast(err.message); }
    }));
    const clear = $app.querySelector("[data-act=clearfollow]");
    if (clear) clear.addEventListener("click", async () => {
      try { await api(`/leads/${l.id}/followup`, { method: "PUT", json: { date: null } }); toast("Callback cleared"); after(); } catch (err) { toast(err.message); }
    });
  }

  /* ---------- lead detail ---------- */
  async function viewLead(id) {
    setNav("home");
    const l = await api("/leads/" + id);
    const r = l.record;
    const lint = l.lint || { publishBlockers: [], errors: [], warnings: [], todos: [], suggestions: [] };
    const blockers = [...lint.errors, ...lint.publishBlockers];
    const ready = l.status === "ready";
    const lookName = (l.looks.find((x) => x.id === l.look) || {}).name || "";
    const owner = isOwner();
    const open = l.salesStatus === "new" || l.salesStatus === "shown";
    $app.innerHTML = `<p><a href="#/">← Leads</a></p>
      <div class="split"><div>
      <section class="card">
        <h1>${esc(r ? r.name : l.name)}</h1>
        <p class="muted">${esc(l.variantLabel || CATEGORY_LABEL[l.category] || "")} · ${esc(l.reason || "")}</p>
        ${l.rating ? `<p><span class="stars">★ ${l.rating.toFixed(1)}</span> on Google</p>` : ""}
        <p>${esc(l.address || "")}</p>
        <div class="btns btns--full">
          ${ready ? `<a class="btn btn--primary" href="#/pitch/${l.id}">Call guide</a>` : ""}
          <a class="btn${ready ? "" : " btn--primary"}" href="${telHref(r ? r.phone.e164.slice(2) : l.phone)}">📞 Call ${esc(r ? r.phone.display : l.phone)}</a>
          ${r ? `<a class="btn" href="${esc(r.mapsUrl)}" target="_blank" rel="noopener">Google listing</a>` : ""}
        </div>
      </section>
      <section class="card"><h2>Sales status</h2>
        ${l.salesStatus === "live"
          ? `<p class="chip chip--good">● Live</p>`
          : `<div class="tabs">${[["new", "New"], ["shown", "Shown"], ["sold", "Sold"], ["not_interested", "Not interested"]].map(([k, t]) => `<button type="button" data-status="${k}" class="${l.salesStatus === k ? "is-on" : ""}">${t}</button>`).join("")}</div>`}
      </section>
      <section class="card"><h2>Website</h2>
        ${l.status === "failed" ? `<p class="chip chip--bad">Build failed</p><p class="small muted">${esc(l.error || "")}</p><button class="btn" data-act="retry">Try again</button>` : ""}
        ${l.status === "queued" || l.status === "building" ? `<p><span class="spin"></span> Building… this takes about a minute.</p>` : ""}
        ${ready ? `<p class="muted small">Look: ${esc(lookName)}</p>
          <div class="btns btns--full">
            <a class="btn btn--primary" href="#/preview/${l.id}">Preview</a>
            <a class="btn" href="/p/${l.id}/" target="_blank" rel="noopener">Open full screen</a>
            ${owner ? `<a class="btn" href="#/edit/${l.id}">Edit</a>` : ""}
          </div>` : ""}
        ${l.liveUrl ? `<p style="margin-top:12px">Live at <a href="${esc(l.liveUrl)}" target="_blank" rel="noopener">${esc(l.liveUrl.replace("https://", ""))}</a></p>` : ""}
      </section>
      <section class="card"><h2>Calls &amp; notes</h2>
        ${l.followUp && open ? `<div class="row" style="margin-bottom:8px">${followChip(l.followUp)}<button class="linkbtn" data-act="clearfollow" style="flex:none">Clear</button></div>` : ""}
        ${notesHtml(l)}
      </section>
      </div><div>
      ${l.salesStatus !== "live" ? logCardHtml(l) : ""}
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

    $app.querySelectorAll("[data-status]").forEach((b) =>
      b.addEventListener("click", async () => {
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
        try { await fn(el); } catch (err) {
          toast(err.data && err.data.blockers ? "Not ready: " + err.data.blockers[0] : err.message);
        } finally { el.disabled = false; }
      });
    };
    act("retry", async () => { await api(`/leads/${id}/retry`, { method: "POST" }); toast("Rebuilding…"); setTimeout(() => viewLead(id), 1500); });
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
      viewLead(id);
      window.open(res.url, "_blank", "noopener");
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

  /* ---------- preview ---------- */
  async function viewPreview(id) {
    setNav("home");
    let mode = matchMedia("(min-width: 760px)").matches ? "desktop" : "phone";
    $app.innerHTML = `<p><a href="#/lead/${id}">← Details</a></p>
      <div class="row" style="margin-bottom:10px"><div class="tabs" style="margin:0">
        <button type="button" data-mode="phone">Phone view</button><button type="button" data-mode="desktop">Desktop view</button></div>
        <a class="btn btn--small" href="/p/${id}/" target="_blank" rel="noopener" style="flex:none">Full screen</a></div>
      <div class="frame-wrap" id="fw"><iframe id="pf" title="Site preview" src="/p/${id}/"></iframe></div>`;
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
    addEventListener("resize", layout, { once: false });
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

  async function viewEdit(id) {
    setNav("home");
    const l = await api("/leads/" + id);
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
      <section class="card"><h2>Photo</h2>
        <p class="small muted">${r.media.hero && r.media.hero.source === "google" ? "Using a Google photo (fine for the preview, but it must be replaced before publishing)." : r.media.hero ? "Using the owner's photo." : "No photo yet."}</p>
        <label class="field">Main photo<input type="file" id="photo" accept="image/*"></label>
        <label class="field">Describe the photo<input id="photoAlt" placeholder="e.g. Freshly mowed front lawn in Cullman"></label>
        <button class="btn btn--small" type="button" id="upload">Upload photo</button>
      </section>
      <section class="card"><h2>Look</h2><label class="field">Design style<select name="look">${l.looks
        .map((x) => `<option value="${esc(x.id)}"${x.id === l.look ? " selected" : ""}>${esc(x.name)}</option>`)
        .join("")}</select></label></section>
      <section class="card"><h2>Facts (only if the owner says so)</h2>
        <label class="field">Year they started<input name="foundedYear" type="number" inputmode="numeric" min="1800" max="2100" value="${r.foundedYear || ""}"></label>
        ${cb("familyOwned", "Family-owned", r.ownershipTags.includes("family_owned"))}
        ${isS ? `<label class="field">Walk-ins or appointments?<select name="walkIns"><option value="">Not set yet</option>${[["welcome", "Walk-ins welcome"], ["appointment_only", "By appointment only"], ["both", "Both"]].map(([v, label]) => `<option value="${v}"${ext.walkIns === v ? " selected" : ""}>${label}</option>`).join("")}</select></label>` : ""}
        ${isC || isL || isK ? cb("insured", "Insured", !!r.insured) : ""}
        ${isK ? cb("bonded", "Bonded", !!r.bonded) : ""}
        ${isC || isL ? `<div class="row"><label class="field">License type<input name="licenseLabel" value="${esc(lic.label || "")}" placeholder="${isC ? "AL Plumbing License" : "License"}"></label>
          <label class="field">License #<input name="licenseNumber" value="${esc(lic.number || "")}"></label></div>` : ""}
        ${isC ? cb("emergencyService", "Offers emergency service", !!ext.emergencyService) : ""}
        ${isA ? `${cb("ase", "ASE-certified", !!ext.ase)}
          <div class="row"><label class="field">Warranty months<input name="warrantyMonths" type="number" inputmode="numeric" value="${w.months || ""}"></label>
          <label class="field">Warranty miles<input name="warrantyMiles" type="number" inputmode="numeric" value="${w.miles || ""}"></label></div>
          ${cb("warrantyNationwide", "Warranty is nationwide", !!w.nationwide)}` : ""}
        ${isK ? `${cb("backgroundChecked", "Team is background-checked", !!ext.backgroundChecked)}${cb("suppliesIncluded", "They bring their own supplies", !!ext.suppliesIncluded)}${cb("petSafe", "Uses pet-safe products", !!ext.petSafe)}` : ""}
        ${isC || isA || isL || isK ? cb("freeEstimates", isA || isC ? "Free estimates" : "Free quotes", !!ext.freeEstimates) : ""}
      </section>
      <section class="card"><h2>Links</h2>
        ${isR ? `<label class="field">Online ordering link<input name="order" type="url" value="${esc(r.links.order || "")}" placeholder="https://"></label>
        <label class="field">Reservations link<input name="reserve" type="url" value="${esc(r.links.reserve || "")}" placeholder="https://"></label>` : ""}
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

    $app.querySelector("#upload").addEventListener("click", async (e) => {
      const file = $app.querySelector("#photo").files[0];
      if (!file) return toast("Choose a photo first");
      e.target.disabled = true;
      try {
        const { blob, w: pw, h: ph } = await resizeImage(file);
        const alt = $app.querySelector("#photoAlt").value || r.name;
        await api(`/leads/${id}/photo?w=${pw}&h=${ph}&alt=${encodeURIComponent(alt)}`, { method: "POST", body: blob, type: "image/jpeg" });
        toast("Photo saved");
        viewEdit(id);
      } catch (err) { toast(err.message); } finally { e.target.disabled = false; }
    });

    $app.querySelector("#ef").addEventListener("submit", async (e) => {
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
        look: val("look"),
        record: {
          name: val("name"),
          phone: val("phone"),
          smsEnabled: on("smsEnabled"),
          showStreetAddress: serviceArea ? on("showStreetAddress") : undefined,
          foundedYear: num("foundedYear"),
          familyOwned: on("familyOwned"),
          insured: on("insured"),
          bonded: on("bonded"),
          license: isC || isL ? (val("licenseNumber") ? { label: val("licenseLabel") || "License", number: val("licenseNumber") } : null) : undefined,
          emergencyService: on("emergencyService"),
          freeEstimates: on("freeEstimates"),
          walkIns: isS ? val("walkIns") || null : undefined,
          ase: on("ase"),
          warranty: isA ? { months: num("warrantyMonths"), miles: num("warrantyMiles"), nationwide: !!on("warrantyNationwide") } : undefined,
          backgroundChecked: on("backgroundChecked"),
          suppliesIncluded: on("suppliesIncluded"),
          petSafe: on("petSafe"),
          links: { order: val("order"), reserve: val("reserve"), booking: val("booking"), facebook: val("facebook"), instagram: val("instagram") },
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

  async function viewPitch(id, regenerate) {
    setNav("home");
    const l = await api("/leads/" + id);
    if (l.status !== "ready") return go("#/lead/" + id);
    const r = l.record;
    const s = meta.settings;
    const phoneDigits = r.phone.e164.slice(2);
    $app.innerHTML = `<p><a href="#/lead/${id}">← Details</a></p>
      <h1>Call guide: ${esc(r.name)}</h1>
      <p class="muted">${esc(l.variantLabel || "")} · ${esc(l.reason || "")}</p>
      <div class="btns btns--full" style="margin-bottom:14px">
        <a class="btn btn--primary" href="${telHref(phoneDigits)}">📞 Call ${esc(r.phone.display)}</a>
        <button class="btn" id="sms">Text preview link</button>
        <button class="btn" id="copy">Copy preview link</button>
      </div>
      <p class="small muted">Only text the link after they say it's OK. The link works for 14 days.</p>
      ${isOwner() && (!s.companyName || !s.monthlyPrice) ? `<div class="card small">Add your company name, your name and your prices in <a href="#/settings">Settings</a> so the guide can use them.</div>` : ""}
      ${l.notes.length ? `<section class="card"><h2>Earlier calls</h2>${l.followUp ? `<p>${followChip(l.followUp)}</p>` : ""}${notesHtml(l, 3)}</section>` : ""}
      <div id="guide"><div class="card"><span class="spin"></span> Writing the call guide for ${esc(r.name)}… (about 20 seconds)</div></div>`;

    const smsBody = (url) => {
      const caller = isOwner() ? s.callerName : meta.me.name;
      const who = [caller ? `this is ${caller}` : "", s.companyName ? `with ${s.companyName}` : ""].filter(Boolean).join(" ");
      return `Hi${who ? ", " + who : ""}. Here's the free website preview I made for ${r.name}: ${url}`;
    };
    $app.querySelector("#sms").addEventListener("click", async (e) => {
      e.target.disabled = true;
      try {
        const url = await shareLink(id);
        location.href = `sms:+1${phoneDigits}?body=${encodeURIComponent(smsBody(url))}`;
      } catch (err) { toast(err.message); } finally { e.target.disabled = false; }
    });
    $app.querySelector("#copy").addEventListener("click", async (e) => {
      e.target.disabled = true;
      try {
        const url = await shareLink(id);
        await navigator.clipboard.writeText(url);
        toast("Preview link copied");
      } catch (err) { toast(err.message); } finally { e.target.disabled = false; }
    });

    let pitch;
    try {
      ({ pitch } = await api(`/leads/${id}/pitch`, { method: regenerate ? "POST" : "GET" }));
    } catch (err) {
      document.getElementById("guide").innerHTML = `<div class="card">${esc(err.message)}</div>`;
      return;
    }
    if (location.hash !== `#/pitch/${id}`) return;
    const list = (items) => `<ul class="list">${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
    document.getElementById("guide").innerHTML = `
      <section class="card opener"><h2>Open with</h2><p class="big">${esc(pitch.opener)}</p></section>
      <div class="grid grid--2">
        <section class="card"><h2>Why it matters for them</h2>${list(pitch.whyItMatters)}</section>
        <section class="card"><h2>What we already built</h2>${list(pitch.whatWeBuilt)}<a class="btn btn--small" href="#/preview/${id}">Open the preview</a></section>
      </div>
      <section class="card"><h2>Questions to ask</h2>${list(pitch.questionsToAsk)}</section>
      <section class="card"><h2>If they say…</h2>${pitch.objections.map((o) => `<details class="obj"><summary>“${esc(o.objection)}”</summary><p>${esc(o.response)}</p></details>`).join("")}</section>
      <section class="card opener"><h2>Ask for the yes</h2><p class="big">${esc(pitch.close)}</p></section>
      <section class="card"><h2>Don't say</h2>${list(pitch.avoid)}</section>
      ${l.salesStatus !== "live" ? logCardHtml(l) : ""}
      <p><button class="btn btn--small" id="regen">Write a fresh guide</button></p>`;
    bindLog(l, () => go("#/lead/" + id));
    document.getElementById("regen").addEventListener("click", () => viewPitch(id, true));
  }

  /* ---------- inbox ---------- */
  async function viewInbox() {
    setNav("inbox");
    const { items } = await api("/inbox");
    document.getElementById("inbox-dot").hidden = !items.some((i) => !i.read);
    $app.innerHTML = `<h1>Inbox</h1><p class="muted">Requests customers send through your clients' live websites.</p>
      <ul class="list">${items.length ? items.map((i) => `<li class="card"><div class="lead__top"><strong>${esc(i.data.name)}</strong>${i.read ? "" : '<span class="chip chip--warn">New</span>'}</div>
        <p class="small muted">For ${esc(i.business || "a client")} · ${ago(i.createdAt)}</p>
        ${i.data.service ? `<p>${esc(i.data.service)}${i.data.town ? " · " + esc(i.data.town) : ""}</p>` : ""}
        ${i.data.message ? `<p>${esc(i.data.message)}</p>` : ""}
        <div class="btns"><a class="btn btn--small btn--primary" href="${telHref(i.data.phone)}">📞 ${esc(i.data.phone)}</a>
        ${i.data.email ? `<a class="btn btn--small" href="mailto:${esc(i.data.email)}">Email</a>` : ""}
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
    return `<section class="card"><h2>Callers</h2>
      <p class="small muted">People who make sales calls. They can see leads, previews and call guides, text preview links, log calls and set callbacks. They can't run searches, edit or publish sites, delete leads, or see settings, spending or the inbox.</p>
      <ul class="list">${callers.length ? callers.map((c) => `<li><div class="row"><strong>${esc(c.name)}</strong>${c.disabled ? `<span class="chip" style="flex:none">Turned off</span>` : ""}</div>
        <div class="btns" style="margin-top:6px">
          <button class="btn btn--small" data-cpass="${c.id}">New password</button>
          <button class="btn btn--small" data-ctoggle="${c.id}" data-off="${c.disabled ? 1 : 0}">${c.disabled ? "Turn on" : "Turn off"}</button>
          <button class="btn btn--small btn--danger" data-cdel="${c.id}">Remove</button></div></li>`).join("") : `<li class="muted small">No callers yet.</li>`}</ul>
      <form id="cf" style="margin-top:12px"><h3>Add a caller</h3>
        <label class="field">Their name<input name="name" maxlength="60" required placeholder="Used in call guides and notes"></label>
        <label class="field">Their password <span class="hint">At least 8 characters, different from yours. Tell them in person.</span><input name="password" type="text" minlength="8" autocomplete="off" required></label>
        <button class="btn btn--primary" type="submit">Add caller</button></form></section>`;
  }

  function bindCallers() {
    $app.querySelector("#cf").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target;
      try {
        await api("/callers", { method: "POST", json: { name: f.name.value.trim(), password: f.password.value } });
        toast("Caller added. They log in with that password.");
        viewSettings();
      } catch (err) { toast(err.message); }
    });
    $app.querySelectorAll("[data-cpass]").forEach((b) => b.addEventListener("click", async () => {
      const password = prompt("New password for this caller (at least 8 characters). They'll be logged out everywhere.");
      if (!password) return;
      try { await api(`/callers/${b.dataset.cpass}`, { method: "PUT", json: { password } }); toast("Password changed"); } catch (err) { toast(err.message); }
    }));
    $app.querySelectorAll("[data-ctoggle]").forEach((b) => b.addEventListener("click", async () => {
      try { await api(`/callers/${b.dataset.ctoggle}`, { method: "PUT", json: { disabled: b.dataset.off !== "1" } }); viewSettings(); } catch (err) { toast(err.message); }
    }));
    $app.querySelectorAll("[data-cdel]").forEach((b) => b.addEventListener("click", async () => {
      if (!confirm("Remove this caller? Their notes stay.")) return;
      try { await api(`/callers/${b.dataset.cdel}`, { method: "DELETE" }); viewSettings(); } catch (err) { toast(err.message); }
    }));
  }

  async function viewSettings() {
    setNav("settings");
    meta = await api("/meta");
    if (!isOwner()) {
      $app.innerHTML = `<h1>Settings</h1><div class="grid grid--2">${deviceCard()}</div>`;
      return bindDevice();
    }
    const [{ last30Days: u }, { callers }] = await Promise.all([api("/usage"), api("/callers")]);
    const s = meta.settings;
    $app.innerHTML = `<h1>Settings</h1><div class="grid grid--2">
      <section class="card"><h2>Your business &amp; runs</h2><form id="sf">
        <label class="field">Default most sites per run<input name="cap" type="number" min="1" max="500" value="${s.defaultCap}"></label>
        <label class="field">Your company name<input name="companyName" value="${esc(s.companyName || "")}" placeholder="e.g. Cullman Web Co."></label>
        <label class="field">Caller's name <span class="hint">Used in call guides you open; callers' own logins use their names</span><input name="callerName" value="${esc(s.callerName || "")}" placeholder="Who makes the calls"></label>
        <div class="row"><label class="field">Setup price ($)<input name="setupPrice" type="number" min="0" inputmode="decimal" value="${s.setupPrice ?? ""}"></label>
        <label class="field">Monthly price ($)<input name="monthlyPrice" type="number" min="0" inputmode="decimal" value="${s.monthlyPrice ?? ""}"></label></div>
        <label class="field">What's included <span class="hint">Used in the call guide</span><textarea name="offerIncludes" rows="3" placeholder="Hosting, updates when you need them, your own domain…">${esc(s.offerIncludes || "")}</textarea></label>
        <label class="field">AI writer<select name="model">${meta.models.map((m) => `<option value="${esc(m.id)}"${m.id === s.copyModel ? " selected" : ""}>${esc(m.label)}</option>`).join("")}</select></label>
        <button class="btn btn--primary" type="submit">Save</button></form></section>
      <section class="card"><h2>Spending, last 30 days</h2><ul class="list">
        <li>AI writing: <strong>$${u.aiCost.toFixed(2)}</strong> <span class="muted small">(${u.aiTokensIn.toLocaleString()} in / ${u.aiTokensOut.toLocaleString()} out tokens)</span></li>
        <li>Google: about <strong>$${u.googleCostEstimate.toFixed(2)}</strong> <span class="muted small">(${u.googleRequests} searches, ${u.googlePhotos} photos; estimate, before Google's free monthly credit)</span></li></ul></section>
      ${callersCard(callers)}
      ${deviceCard()}
    </div>`;
    bindCallers();
    bindDevice();
    $app.querySelector("#sf").addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const f = e.target;
        const n = (v) => (v === "" ? undefined : Number(v));
        await api("/settings", {
          method: "PUT",
          json: {
            defaultCap: Number(f.cap.value),
            copyModel: f.model.value,
            companyName: f.companyName.value.trim() || undefined,
            callerName: f.callerName.value.trim() || undefined,
            setupPrice: n(f.setupPrice.value),
            monthlyPrice: n(f.monthlyPrice.value),
            offerIncludes: f.offerIncludes.value.trim() || undefined,
          },
        });
        meta = null;
        toast("Saved");
      } catch (err) { toast(err.message); }
    });
  }

  /* ---------- router ---------- */
  function go(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  async function render() {
    stopPolling();
    const h = location.hash || "#/";
    let m;
    try {
      if (h === "#/login") return await viewLogin();
      meta = meta || (await api("/meta"));
      if (!isOwner() && (/^#\/edit\//.test(h) || h === "#/inbox")) return go("#/");
      if ((m = /^#\/lead\/([a-z0-9]+)$/.exec(h))) return await viewLead(m[1]);
      if ((m = /^#\/edit\/([a-z0-9]+)$/.exec(h))) return await viewEdit(m[1]);
      if ((m = /^#\/preview\/([a-z0-9]+)$/.exec(h))) return await viewPreview(m[1]);
      if ((m = /^#\/pitch\/([a-z0-9]+)$/.exec(h))) return await viewPitch(m[1]);
      if (h === "#/inbox") return await viewInbox();
      if (h === "#/settings") return await viewSettings();
      $app.innerHTML = "";
      return await viewHome();
    } catch (err) {
      if (err.status !== 401) {
        $app.innerHTML = `<div class="card"><p>${esc(err.message)}</p><button class="btn" id="reload">Reload</button></div>`;
        $app.querySelector("#reload").addEventListener("click", () => location.reload());
      }
    }
  }

  addEventListener("hashchange", render);
  addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installPrompt = e; });
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  render();
})();
