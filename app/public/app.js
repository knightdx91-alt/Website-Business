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
  const SALES = [["new", "New"], ["shown", "Shown"], ["sold", "Sold"], ["live", "Live"], ["", "All"]];
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
    $nav.querySelectorAll("a").forEach((a) => a.classList.toggle("is-active", a.dataset.nav === active));
  }

  /* ---------- login ---------- */
  async function viewLogin() {
    setNav("login");
    const state = await api("/auth/state");
    if (state.loggedIn) return go("#/");
    const setup = !state.hasOwner;
    $app.innerHTML = `<div class="login card">
      <h1>${setup ? "Create your password" : "Log in"}</h1>
      <p class="muted">${setup ? "First time here. Pick a password only you know. You'll use it to open the app on any device." : "Enter your password."}</p>
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
      <div class="btns btns--full">
        <a class="btn btn--small" href="${telHref(l.phone)}">📞 Call</a>
        ${l.status === "ready" ? `<a class="btn btn--small btn--primary" href="#/preview/${l.id}">Preview</a>` : ""}
        <a class="btn btn--small" href="#/lead/${l.id}">Details</a>
      </div></li>`;
  }

  async function viewHome() {
    setNav("home");
    meta = meta || (await api("/meta"));
    if (!document.getElementById("run")) {
      $app.innerHTML = `<div class="split"><div>${runCard()}<div id="runs"></div></div><div><section>
        <div class="tabs" role="tablist">${SALES.map(([k, l]) => `<button type="button" data-sales="${k}" class="${filters.sales === k ? "is-on" : ""}">${l}</button>`).join("")}</div>
        <label class="field"><span class="sr-only">Category</span><select id="catfilter"><option value="">All categories</option>${meta.categories
          .map((c) => `<option value="${esc(c.id)}"${filters.category === c.id ? " selected" : ""}>${esc(c.label)}</option>`)
          .join("")}</select></label>
        <ul class="list" id="leads"><li class="muted">Loading…</li></ul></section></div></div>`;
      const form = $app.querySelector("#run");
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
    if (filters.sales) q.set("sales", filters.sales);
    if (filters.category) q.set("category", filters.category);
    try {
      const [{ runs }, { leads }] = await Promise.all([api("/runs"), api("/leads?" + q)]);
      const runsEl = document.getElementById("runs");
      const leadsEl = document.getElementById("leads");
      if (!runsEl || !leadsEl) return;
      runsEl.innerHTML = runsHtml(runs);
      leadsEl.innerHTML = leads.length
        ? leads.map(leadCard).join("")
        : `<li class="card muted">${filters.sales === "new" ? "No new leads yet. Pick a category and tap Run." : "Nothing here yet."}</li>`;
      const busy = runs.some((r) => !r.done) || leads.some((l) => l.status === "queued" || l.status === "building");
      if (busy) pollTimer = setTimeout(refreshHome, 5000);
    } catch (err) {
      if (err.status !== 401) toast(err.message);
    }
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
    $app.innerHTML = `<p><a href="#/">← Leads</a></p>
      <div class="split"><div>
      <section class="card">
        <h1>${esc(r ? r.name : l.name)}</h1>
        <p class="muted">${esc(l.variantLabel || CATEGORY_LABEL[l.category] || "")} · ${esc(l.reason || "")}</p>
        ${l.rating ? `<p><span class="stars">★ ${l.rating.toFixed(1)}</span> on Google</p>` : ""}
        <p>${esc(l.address || "")}</p>
        <div class="btns btns--full">
          <a class="btn btn--primary" href="${telHref(r ? r.phone.e164.slice(2) : l.phone)}">📞 Call ${esc(r ? r.phone.display : l.phone)}</a>
          ${r ? `<a class="btn" href="${esc(r.mapsUrl)}" target="_blank" rel="noopener">Google listing</a>` : ""}
        </div>
      </section>
      <section class="card"><h2>Sales status</h2>
        ${l.salesStatus === "live"
          ? `<p class="chip chip--good">● Live</p>`
          : `<div class="tabs">${[["new", "New"], ["shown", "Shown"], ["sold", "Sold"]].map(([k, t]) => `<button type="button" data-status="${k}" class="${l.salesStatus === k ? "is-on" : ""}">${t}</button>`).join("")}</div>`}
      </section>
      <section class="card"><h2>Website</h2>
        ${l.status === "failed" ? `<p class="chip chip--bad">Build failed</p><p class="small muted">${esc(l.error || "")}</p><button class="btn" data-act="retry">Try again</button>` : ""}
        ${l.status === "queued" || l.status === "building" ? `<p><span class="spin"></span> Building… this takes about a minute.</p>` : ""}
        ${ready ? `<p class="muted small">Look: ${esc(lookName)}</p>
          <div class="btns btns--full">
            <a class="btn btn--primary" href="#/preview/${l.id}">Preview</a>
            <a class="btn" href="/p/${l.id}/" target="_blank" rel="noopener">Open full screen</a>
            <a class="btn" href="#/edit/${l.id}">Edit</a>
          </div>` : ""}
        ${l.liveUrl ? `<p style="margin-top:12px">Live at <a href="${esc(l.liveUrl)}" target="_blank" rel="noopener">${esc(l.liveUrl.replace("https://", ""))}</a></p>` : ""}
      </section>
      </div><div>
      ${ready ? `<section class="card"><h2>${blockers.length ? "Before you can publish" : "Ready to publish"}</h2>
        ${blockers.length ? `<ul class="list small">${blockers.map((b) => `<li>${esc(b)}</li>`).join("")}</ul><p class="small muted">Fill these in from Edit.</p>` : `<p class="muted">Everything's confirmed. Publishing puts the site on the internet.</p>`}
        ${(lint.suggestions || []).length ? `<h3 style="margin-top:12px">Good to add (talking points)</h3><ul class="list small">${lint.suggestions.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
        <div class="btns btns--full">
          <button class="btn btn--good" data-act="publish"${blockers.length ? " disabled" : ""}>${l.liveUrl ? "Republish changes" : "Publish to Cloudflare"}</button>
          <button class="btn" data-act="zip"${blockers.length ? " disabled" : ""}>Download zip</button>
        </div></section>` : ""}
      <section class="card"><h2>More</h2><div class="btns">
        ${ready ? `<button class="btn btn--small" data-act="rewrite">Rewrite text with AI</button>` : ""}
        ${l.salesStatus !== "live" ? `<button class="btn btn--small btn--danger" data-act="delete">Delete lead</button>` : ""}
      </div></section></div></div>`;

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
  async function viewSettings() {
    setNav("settings");
    meta = await api("/meta");
    const { last30Days: u } = await api("/usage");
    const s = meta.settings;
    $app.innerHTML = `<h1>Settings</h1><div class="grid grid--2">
      <section class="card"><h2>Runs</h2><form id="sf">
        <label class="field">Default most sites per run<input name="cap" type="number" min="1" max="500" value="${s.defaultCap}"></label>
        <label class="field">AI writer<select name="model">${meta.models.map((m) => `<option value="${esc(m.id)}"${m.id === s.copyModel ? " selected" : ""}>${esc(m.label)}</option>`).join("")}</select></label>
        <button class="btn btn--primary" type="submit">Save</button></form></section>
      <section class="card"><h2>Spending, last 30 days</h2><ul class="list">
        <li>AI writing: <strong>$${u.aiCost.toFixed(2)}</strong> <span class="muted small">(${u.aiTokensIn.toLocaleString()} in / ${u.aiTokensOut.toLocaleString()} out tokens)</span></li>
        <li>Google: about <strong>$${u.googleCostEstimate.toFixed(2)}</strong> <span class="muted small">(${u.googleRequests} searches, ${u.googlePhotos} photos; estimate, before Google's free monthly credit)</span></li></ul></section>
      <section class="card"><h2>This device</h2><div class="btns">
        <button class="btn" id="install"${installPrompt ? "" : " hidden"}>Install app</button>
        <button class="btn btn--danger" id="logout">Log out</button></div>
        <p class="small muted">${installPrompt ? "" : "To put this on your home screen: open the browser menu (⋮) and tap “Add to Home screen”."}</p></section>
    </div>`;
    $app.querySelector("#sf").addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await api("/settings", { method: "PUT", json: { defaultCap: Number(e.target.cap.value), copyModel: e.target.model.value } });
        meta = null;
        toast("Saved");
      } catch (err) { toast(err.message); }
    });
    $app.querySelector("#logout").addEventListener("click", async () => { await api("/auth/logout", { method: "POST" }); meta = null; go("#/login"); });
    const inst = $app.querySelector("#install");
    inst.addEventListener("click", async () => { if (!installPrompt) return; installPrompt.prompt(); installPrompt = null; inst.hidden = true; });
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
      if ((m = /^#\/lead\/([a-z0-9]+)$/.exec(h))) return await viewLead(m[1]);
      if ((m = /^#\/edit\/([a-z0-9]+)$/.exec(h))) return await viewEdit(m[1]);
      if ((m = /^#\/preview\/([a-z0-9]+)$/.exec(h))) return await viewPreview(m[1]);
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
