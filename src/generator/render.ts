import { CLIENT_SCRIPT } from "./client-script.ts";
import { actionBar, announcements, footer, gallery, header, hiring, sectionHead, type Ctx } from "./components.ts";
import { buildCss, fontFileName } from "./css.ts";
import { hasAnyHours } from "./hours.ts";
import { html, jsonForScript, raw, type Raw } from "./html.ts";
import { dnaAttrs } from "./dna.ts";
import { lintSite, type LintResult } from "./lint.ts";
import { packFor } from "./packs/index.ts";
import type { CategoryPack } from "./packs/types.ts";
import { businessNode, faqNode, graph, originFor, webPageNode, websiteNode } from "./schema.ts";
import { spanishNav, spanishPage } from "./spanish.ts";
import { resolveTheme } from "./themes.ts";
import type { BuildMode, BusinessRecord, Copy, Site } from "./types.ts";

export interface BuildInput {
  record: BusinessRecord;
  copy: Copy;
  site: Site;
  mode: BuildMode;
  formEndpoint?: string;
  statsEndpoint?: string;
  reviewTexts?: string[];
  /** Returns the bytes of an @fontsource woff2 file. Omit to leave fonts out (previews serve them separately). */
  loadFont?: (pkg: string, file: string) => Promise<Uint8Array>;
  /** Live sites only: a small "Website by …" credit and a "Request a change" link for the business owner. */
  credit?: { company: string; url: string; changeUrl: string };
  /** Prefix for every internal link and asset, e.g. "/p/abc123" when a preview is served under a path. */
  basePath?: string;
}

export interface BuildOutput {
  files: Map<string, string | Uint8Array>;
  lint: LintResult;
  todos: string[];
  suggestions: string[];
  look: string;
}

interface DocOpts {
  path: string;
  title: string;
  description: string;
  body: Raw;
  jsonLd: Record<string, unknown>;
  lang?: "en" | "es";
}

/** A tiny favicon with the business initial in the hero colors, inline so the site needs no extra request or file. */
export function faviconDataUrl(name: string, bg: string, fg: string): string {
  const initial = (/[A-Za-z0-9]/.exec(name)?.[0] ?? "•").toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${bg}"/><text x="32" y="45" text-anchor="middle" font-family="system-ui,Arial,sans-serif" font-size="38" font-weight="700" fill="${fg}">${initial}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg).replace(/%20/g, " ")}`;
}

function doc(ctx: Ctx, pack: CategoryPack, o: DocOpts): string {
  const origin = originFor(ctx);
  const preview = ctx.mode === "preview";
  const headingFont = ctx.theme.fonts.heading;
  const baseNav = ctx.copy.es ? [...pack.nav(ctx), { label: "Español", href: "/es/" }] : pack.nav(ctx);
  const nav = o.lang === "es" ? spanishNav(baseNav, ctx.copy.es) : baseNav;
  const alternates = ctx.copy.es && (o.path === "/" || o.path === "/es/") && !preview;
  // Link previews (texts, Facebook) get the hero photo when it's one we may show; Google photos stay out of the HTML.
  const heroImg = ctx.r.media.hero;
  const ogImage = heroImg && heroImg.source !== "google" ? new URL(heroImg.src, origin).toString() : undefined;
  return `<!doctype html>${html`<html lang="${o.lang ?? "en"}" class="no-js"${raw(dnaAttrs(ctx.theme.dna))}><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${o.title}</title>
<meta name="description" content="${o.description}">
${preview ? html`<meta name="robots" content="noindex, nofollow">` : html`<link rel="canonical" href="${origin}${o.path}">`}
${alternates ? html`<link rel="alternate" hreflang="en" href="${origin}/"><link rel="alternate" hreflang="es" href="${origin}/es/">` : ""}
<meta name="theme-color" content="${ctx.theme.colors.heroBg}">
${ctx.statsEndpoint ? html`<meta name="wb-stats" content="${ctx.statsEndpoint}">` : ""}
<meta property="og:type" content="website"><meta property="og:title" content="${o.title}"><meta property="og:description" content="${o.description}"><meta property="og:url" content="${origin}${o.path}">
${ogImage ? html`<meta property="og:image" content="${ogImage}">${heroImg!.width && heroImg!.height ? html`<meta property="og:image:width" content="${heroImg!.width}"><meta property="og:image:height" content="${heroImg!.height}">` : ""}` : ""}
<meta name="twitter:card" content="${ogImage ? "summary_large_image" : "summary"}">
<link rel="icon" href="${faviconDataUrl(ctx.r.name, ctx.theme.colors.heroBg, ctx.theme.colors.onHero)}">
<link rel="preload" href="/assets/fonts/${fontFileName(headingFont, headingFont.weights[0]!)}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/site.css">
<script defer src="/assets/site.js"></script>
<script type="application/ld+json">${jsonForScript(o.jsonLd)}</script>
${hasAnyHours(ctx.r.hours) ? html`<script type="application/json" id="hours-data">${jsonForScript({ tz: ctx.r.timezone, hours: ctx.r.hours })}</script>` : ""}
</head><body>
${header(ctx, nav)}
${o.body}
${footer(ctx, nav, { note: pack.footerNote?.(ctx), reviews: pack.reviewsAllowed?.(ctx.r) ?? true })}
${actionBar(pack.actionBar(ctx), ctx.theme.dna)}
</body></html>`}`;
}

/** Sections every pack gets: the owner's photo gallery (before reviews, unless the pack placed it) and "We're hiring" (before the closing call to action). */
function withExtras(ctx: Ctx, body: Raw): Raw {
  let out = body.value;
  if (!ctx.galleryShown) {
    const photos = gallery(ctx).value;
    if (photos) out = out.includes('id="reviews"') ? out.replace(/<section class="section[^"]*" id="reviews"/, (m) => photos + m) : out.replace("</main>", `${photos}</main>`);
  }
  if (!ctx.eventsShown) {
    // Dated events/specials go right after the opening (before the first section) when the pack didn't place them.
    const ev = announcements(ctx).value;
    if (ev) out = /<section class="section[ "]/.test(out) ? out.replace(/<section class="section[ "]/, (m) => ev + m) : out.replace("</main>", `${ev}</main>`);
  }
  const jobs = hiring(ctx).value;
  if (jobs) out = /<section class="cta[ "]/.test(out) ? out.replace(/<section class="cta[ "]/, (m) => jobs + m) : out.replace("</main>", `${jobs}</main>`);
  return raw(out);
}

function privacyBody(ctx: Ctx): Raw {
  return html`<main id="main" class="section"><div class="wrap narrow">
<h1>Privacy</h1>
<p>When you send a request through this website, ${ctx.r.name} receives the details you enter (your name, phone number, email if given, and your message) so we can get back to you. We use them only to answer your request.</p>
<p>We don't sell your information or share it with anyone else, except the service that delivers the message to us.</p>
<p>This site doesn't use advertising or tracking cookies. We count visits and button taps anonymously, without cookies or any personal details, so we know the site is helping.</p>
<p>Questions? Call us at <a href="tel:${ctx.r.phone.e164}">${ctx.r.phone.display}</a>.</p>
</div></main>`;
}

export async function buildSite(input: BuildInput): Promise<BuildOutput> {
  const pack = packFor(input.record.category);
  const look = input.site.look || pack.defaultLook(input.record);
  const theme = resolveTheme(look);
  const ctx: Ctx = {
    r: input.record,
    copy: input.copy,
    theme,
    mode: input.mode,
    site: { ...input.site, look },
    todos: [],
    suggestions: [],
    formEndpoint: input.formEndpoint,
    statsEndpoint: input.mode === "publish" ? input.statsEndpoint : undefined,
    hasForm: pack.hasForm(input.record),
    credit: input.mode === "publish" ? input.credit : undefined,
    reviewsAllowed: pack.reviewsAllowed?.(input.record) ?? true,
  };
  const files = new Map<string, string | Uint8Array>();
  const pages: Array<{ path: string; html: string }> = [];

  const homeFaq = pack.homeFaq(ctx);
  const homeLd = graph([
    businessNode(ctx, pack.schemaType(ctx.r), pack.schemaExtras(ctx)),
    websiteNode(ctx),
    ...webPageNode(ctx, "/", pack.homeTitle(ctx.r, ctx.copy.cuisineLabel)),
    ...(homeFaq.length >= 3 ? [faqNode(homeFaq)] : []),
  ]);
  const home = doc(ctx, pack, {
    path: "/",
    title: pack.homeTitle(ctx.r, ctx.copy.cuisineLabel),
    description: ctx.copy.meta.description,
    body: withExtras(ctx, pack.home(ctx)),
    jsonLd: homeLd,
  });
  pages.push({ path: "/", html: home });

  const spanish = spanishPage(ctx);
  if (spanish) {
    pages.push({
      path: "/es/",
      html: doc(ctx, pack, { path: "/es/", title: spanish.title, description: spanish.description, body: spanish.body, jsonLd: graph(webPageNode(ctx, "/es/", spanish.title, "Español")), lang: "es" }),
    });
  }

  for (const p of pack.pages(ctx)) {
    const page = doc(ctx, pack, {
      path: p.path,
      title: p.title,
      description: p.description,
      body: html`<main id="main">${p.body}</main>`,
      jsonLd: graph([...webPageNode(ctx, p.path, p.title, p.crumb), ...(p.jsonLd ?? [])]),
    });
    pages.push({ path: p.path, html: page });
  }

  if (ctx.hasForm) {
    pages.push({
      path: "/privacy/",
      html: doc(ctx, pack, {
        path: "/privacy/",
        title: `Privacy | ${ctx.r.name}`.slice(0, 60),
        description: `How ${ctx.r.name} handles the information you send through this website's request form. We use it only to answer you.`,
        body: privacyBody(ctx),
        jsonLd: graph(webPageNode(ctx, "/privacy/", "Privacy", "Privacy")),
      }),
    });
    pages.push({
      path: "/thanks/",
      html: doc(ctx, pack, {
        path: "/thanks/",
        title: `Thanks | ${ctx.r.name}`.slice(0, 60),
        description: `Thanks for reaching out to ${ctx.r.name}. We got your request and will call you back soon. Need us sooner? Give us a call.`,
        body: html`<main id="main" class="section"><div class="wrap narrow"><h1>Thanks, we got it.</h1><p class="lead">We'll call you back soon. Need us sooner? Call <a href="tel:${ctx.r.phone.e164}">${ctx.r.phone.display}</a>.</p><p><a href="/">Back to the home page</a></p></div></main>`,
        jsonLd: graph(webPageNode(ctx, "/thanks/", "Thanks")),
      }),
    });
  }

  const notFound = doc(ctx, pack, {
    path: "/404.html",
    title: `Page not found | ${ctx.r.name}`.slice(0, 60),
    description: `This page doesn't exist on the ${ctx.r.name} website. Head back to the home page or give us a call at ${ctx.r.phone.display}.`,
    body: html`<main id="main" class="section"><div class="wrap narrow"><h1>Page not found</h1>${sectionHead(undefined, "Let's get you back on track")}<p><a href="/">Go to the home page</a> or call <a href="tel:${ctx.r.phone.e164}">${ctx.r.phone.display}</a>.</p></div></main>`,
    jsonLd: graph(webPageNode(ctx, "/404.html", "Page not found")),
  });

  for (const p of pages) files.set(p.path === "/" ? "index.html" : `${p.path.replace(/^\//, "")}index.html`, p.html);
  files.set("404.html", notFound);

  const css = buildCss(theme);
  files.set("assets/site.css", css);
  files.set("assets/site.js", CLIENT_SCRIPT);
  if (input.loadFont) {
    for (const f of [theme.fonts.heading, theme.fonts.body]) {
      for (const w of f.weights) {
        const name = fontFileName(f, w);
        files.set(`assets/fonts/${name}`, await input.loadFont(f.pkg, name));
      }
    }
  }

  if (input.mode === "publish") {
    const origin = originFor(ctx);
    files.set("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
    files.set(
      "sitemap.xml",
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
        .filter((p) => p.path !== "/thanks/")
        .map((p) => `<url><loc>${origin}${p.path}</loc></url>`)
        .join("\n")}\n</urlset>\n`,
    );
    files.set(
      "_headers",
      // Pages serves ETags, so CSS/JS revalidate on every visit (a redeploy shows up at once); font files are immutable per name.
      `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()\n/assets/*\n  Cache-Control: public, max-age=0, must-revalidate\n/assets/fonts/*\n  Cache-Control: public, max-age=604800\n`,
    );
  } else {
    files.set("robots.txt", "User-agent: *\nDisallow: /\n");
  }

  const lint = lintSite({
    record: ctx.r,
    copy: ctx.copy,
    mode: input.mode,
    pages: [...pages, { path: "/404.html", html: notFound }],
    todos: [...new Set(ctx.todos)],
    reviewTexts: input.reviewTexts,
    assetBytes: css.length + CLIENT_SCRIPT.length,
    banned: pack.bannedPhrases?.(ctx.r),
  });
  if (input.mode === "publish" && (lint.errors.length || lint.publishBlockers.length)) {
    throw new Error(`Publish blocked:\n- ${[...lint.errors, ...lint.publishBlockers].join("\n- ")}`);
  }
  if (input.basePath) {
    const base = input.basePath.replace(/\/+$/, "");
    for (const [path, content] of files) {
      if (typeof content !== "string") continue;
      if (path.endsWith(".html")) files.set(path, content.replace(/\b(href|src|action)="\/(?!\/)/g, `$1="${base}/`));
      else if (path.endsWith(".css")) files.set(path, content.replace(/url\(\/assets\//g, `url(${base}/assets/`));
    }
  }
  return { files, lint, todos: [...new Set(ctx.todos)], suggestions: [...new Set(ctx.suggestions)], look };
}

/** Every font file a look needs, so callers can serve or bundle them. */
export function fontFilesFor(lookId: string): Array<{ pkg: string; file: string }> {
  const t = resolveTheme(lookId);
  return [t.fonts.heading, t.fonts.body].flatMap((f) => f.weights.map((w) => ({ pkg: f.pkg, file: fontFileName(f, w) })));
}
