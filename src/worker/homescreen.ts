import { escHtml } from "./page.ts";

/**
 * "Add to your home screen", with the shop's own name: a web app manifest per shop for the board (`/c/<token>/manifest.webmanifest`)
 * and the tablet display (`/d/<id>/manifest.webmanifest`), an SVG icon with the shop's initial, and a small bar on the page that
 * uses Chrome's install prompt on Android (`beforeinstallprompt`) or tells an iPhone to use Share → Add to Home Screen. No app
 * store, no account: the installed icon opens the same page, full screen, under the shop's name.
 */

const NAVY = "#14213d";
const GOLD = "#fca311";

/** A rounded navy square with the shop's first letter in gold (what the installed icon shows). */
export function appIconSvg(name: string): Response {
  const letter = (name.trim().match(/[A-Za-z0-9]/)?.[0] ?? "•").toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="${NAVY}"/><text x="256" y="338" text-anchor="middle" font-family="system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif" font-size="300" font-weight="800" fill="${GOLD}">${escHtml(letter)}</text></svg>`;
  return new Response(svg, { headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=86400" } });
}

export interface ManifestOpts {
  /** "King Fish Aquatics · Tank board" */
  name: string;
  /** What the icon is labelled with (12 characters is Android's comfortable limit; longer gets cut). */
  shortName: string;
  description: string;
  startUrl: string;
  scope: string;
  /** Where `icon.svg` lives (same folder as the manifest). */
  iconUrl: string;
  display?: "standalone" | "fullscreen";
  orientation?: "any" | "landscape" | "portrait";
}

/** The manifest Chrome reads before offering "Add to Home screen". The brand PNGs satisfy its 192/512 px rule; the SVG carries the shop's letter. */
export function webManifest(o: ManifestOpts): Response {
  const body = {
    name: o.name,
    short_name: o.shortName,
    description: o.description,
    start_url: o.startUrl,
    scope: o.scope,
    id: o.startUrl,
    display: o.display ?? "standalone",
    orientation: o.orientation ?? "any",
    background_color: NAVY,
    theme_color: NAVY,
    icons: [
      { src: o.iconUrl, sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/brand/logo-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
      { src: "/brand/logo-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
  };
  return new Response(JSON.stringify(body), { headers: { "content-type": "application/manifest+json", "cache-control": "no-store" } });
}

/** `<head>` tags: the manifest link, iOS's home-screen title and icon, the theme colour. */
export function homescreenHead(o: { manifestUrl: string; title: string }): string {
  return `<link rel="manifest" href="${escHtml(o.manifestUrl)}"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="${escHtml(o.title)}"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`;
}

/**
 * The bar + script. Shows once Chrome says the page is installable (or at once on an iPhone, with the Share instructions), never
 * when already opened from the home screen, and stays away for 30 days after "Not now". `key` keeps the dismissal per shop.
 */
export function homescreenPrompt(o: { appName: string; key: string; dark?: boolean }): string {
  const bg = o.dark ? "#141f38" : "#fff";
  const ink = o.dark ? "#f6f7fb" : "#16181d";
  const line = o.dark ? "#2b3a5e" : "#e1e4ea";
  return `<div id="a2hs" role="dialog" aria-label="Add to home screen" style="display:none;position:fixed;left:12px;right:12px;bottom:calc(84px + env(safe-area-inset-bottom));z-index:12;background:${bg};color:${ink};border:1px solid ${line};border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.25);padding:12px 14px;font:15px/1.4 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;max-width:720px;margin:0 auto"><div style="display:flex;gap:10px;align-items:center"><img src="${escHtml(o.key)}/icon.svg" alt="" width="44" height="44" style="border-radius:10px;flex:none"><div style="flex:1;min-width:0"><b>Add ${escHtml(o.appName)} to your home screen</b><div id="a2hsMsg" style="font-size:.9em;opacity:.8">Opens like an app, full screen, one tap away.</div></div></div><div style="display:flex;gap:8px;margin-top:10px;justify-content:flex-end"><button id="a2hsNo" type="button" style="border:1px solid ${line};background:transparent;color:inherit;border-radius:10px;padding:8px 12px;font:inherit;cursor:pointer">Not now</button><button id="a2hsGo" type="button" style="border:0;background:${GOLD};color:${NAVY};border-radius:10px;padding:8px 14px;font:inherit;font-weight:700;cursor:pointer">Add</button></div></div>
<script>
(function(){
var KEY="a2hs."+${JSON.stringify(o.key)};var bar=document.getElementById("a2hs"),go=document.getElementById("a2hsGo"),no=document.getElementById("a2hsNo"),msg=document.getElementById("a2hsMsg");var deferred=null;
function standalone(){try{return window.matchMedia("(display-mode: standalone)").matches||window.matchMedia("(display-mode: fullscreen)").matches||navigator.standalone===true}catch(e){return false}}
function snoozed(){try{var t=+localStorage.getItem(KEY)||0;return t&&Date.now()-t<30*864e5}catch(e){return false}}
function show(){if(standalone()||snoozed())return;bar.style.display="block"}
function hide(snooze){bar.style.display="none";if(snooze){try{localStorage.setItem(KEY,String(Date.now()))}catch(e){}}}
var ios=/iPhone|iPad|iPod/.test(navigator.userAgent)&&!window.MSStream;
window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();deferred=e;show()});
window.addEventListener("appinstalled",function(){hide(false);try{localStorage.setItem(KEY,String(Date.now()))}catch(x){}});
if(ios){msg.textContent="Tap Share (the square with an arrow), then \\"Add to Home Screen\\".";go.textContent="Show me";setTimeout(show,1500)}
go.addEventListener("click",function(){if(deferred){var p=deferred;deferred=null;p.prompt();p.userChoice.then(function(){hide(true)})}else if(ios){msg.textContent="In Safari: tap Share at the bottom (the square with an arrow), scroll, tap \\"Add to Home Screen\\", then Add.";go.style.display="none"}else{msg.textContent="In Chrome: tap the \\u22ee menu, then \\"Add to Home screen\\" (or \\"Install app\\").";go.style.display="none"}});
no.addEventListener("click",function(){hide(true)});
})();
</script>`;
}
