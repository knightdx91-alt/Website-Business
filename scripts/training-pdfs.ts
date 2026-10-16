/**
 * Printable training handbooks (Oct 2026, owner's ask): one PDF for the marketing team, one for callers (phone + in person),
 * on brand: the UA badge, print navy / gold (the screen navy prints gray, see mailer-flyer.ts), Montserrat / Inter.
 *   npx tsx scripts/training-pdfs.ts [--out research/training] [--phone 256-636-5886] [--png <dir>]
 * Writes <out>/UA-Marketing-Training.pdf and <out>/UA-Caller-Training.pdf. Prices and plan contents mirror live Settings
 * (Oct 2026); rerun after a price change. Not served by the app: hand the files to the team.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const outDir = opt("out", "research/training");
const phone = opt("phone", "(256) 636-5886");
const pngDir = args.includes("--png") ? opt("png", "") : "";
const NAVY = "#1d3d8f";
const GOLD = "#f59e0b";
const INK = "#16233f";
const MUTED = "#55627a";
const TINT = "#eef2fb";
const EDITION = "October 2026";

const font = async (pkg: string, w: number) =>
  (await readFile(`node_modules/@fontsource/${pkg}/files/${pkg}-latin-${w}-normal.woff2`)).toString("base64");
const logo = (await readFile("app/public/brand/logo.svg", "utf8"))
  .replace(/<\?xml[^>]*>/, "")
  .replaceAll("#14213d", NAVY)
  .replaceAll("#fca311", GOLD)
  .replace('stroke-width="8"', 'stroke-width="18"')
  .replace(/r="7" fill/g, 'r="12" fill')
  .replace('height="11" rx="5.5"', 'height="16" rx="8"');

const css = `
@font-face{font-family:B;font-weight:800;src:url(data:font/woff2;base64,${await font("bricolage-grotesque", 800)})}
@font-face{font-family:M;font-weight:700;src:url(data:font/woff2;base64,${await font("montserrat", 700)})}
@font-face{font-family:M;font-weight:800;src:url(data:font/woff2;base64,${await font("montserrat", 800)})}
@font-face{font-family:I;font-weight:400;src:url(data:font/woff2;base64,${await font("inter", 400)})}
@font-face{font-family:I;font-weight:600;src:url(data:font/woff2;base64,${await font("inter", 600)})}
@font-face{font-family:I;font-weight:700;src:url(data:font/woff2;base64,${await font("inter", 700)})}
@page{size:8.5in 11in;margin:.75in .7in .8in}
@page:first{margin:0}
*{box-sizing:border-box;margin:0;padding:0}
body{font:400 10pt/1.45 I,sans-serif;color:${INK};-webkit-print-color-adjust:exact;print-color-adjust:exact}
b,strong{font-weight:700}
.cover{width:8.5in;height:11in;background:${NAVY};color:#fff;position:relative;overflow:hidden;padding:.8in .75in;display:flex;flex-direction:column;page-break-after:always}
.cover:before{content:"";position:absolute;right:-1.6in;top:-1.6in;width:5.2in;height:5.2in;border-radius:50%;border:.22in solid ${GOLD};opacity:.95}
.cover:after{content:"";position:absolute;left:-1.2in;bottom:-2.2in;width:4.6in;height:4.6in;border-radius:50%;background:rgba(255,255,255,.06)}
.cover .badge{width:1.9in;height:1.9in;position:relative;z-index:1}
.cover .badge svg{width:1.9in;height:1.9in;display:block}
.cover .co{font:800 13pt/1 M,sans-serif;letter-spacing:.12em;text-transform:uppercase;margin-top:.35in;position:relative;z-index:1}
.cover .kicker{font:700 11pt/1 I,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:${GOLD};margin-top:1.1in;position:relative;z-index:1}
.cover h1{font:800 44pt/1.02 B,sans-serif;letter-spacing:-.02em;margin-top:.18in;max-width:6.2in;position:relative;z-index:1}
.cover .lede{font:600 14pt/1.45 I,sans-serif;margin-top:.25in;max-width:5.6in;opacity:.92;position:relative;z-index:1}
.cover .inside{margin-top:auto;position:relative;z-index:1;display:grid;grid-template-columns:1fr 1fr;gap:.06in .4in;font:600 10.5pt/1.4 I,sans-serif;max-width:6in}
.cover .inside h3{grid-column:1/-1;font:800 10pt/1 M,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:${GOLD};margin-bottom:.08in}
.cover .inside span:before{content:"";display:inline-block;width:.07in;height:.07in;border-radius:50%;background:${GOLD};margin-right:.1in;vertical-align:.02in}
.cover .meta{position:relative;z-index:1;margin-top:.45in;padding-top:.18in;border-top:1px solid rgba(255,255,255,.25);display:flex;justify-content:space-between;font:600 9.5pt/1.4 I,sans-serif;opacity:.85}
.chap{margin-top:.38in}
.chap.brk{page-break-before:always;margin-top:0}
.chap-head{page-break-after:avoid;page-break-inside:avoid}
.chap-head+*{page-break-before:avoid}
.chap-head{display:flex;align-items:center;gap:.16in;border-bottom:3px solid ${GOLD};padding-bottom:.14in;margin-bottom:.22in}
.chap-head .num{flex:none;width:.5in;height:.5in;border-radius:50%;background:${NAVY};color:#fff;font:800 17pt/.5in M,sans-serif;text-align:center}
.chap-head h2{font:800 23pt/1.05 B,sans-serif;color:${NAVY};letter-spacing:-.01em}
.chap-head p{font:600 10pt/1.3 I,sans-serif;color:${MUTED};margin-top:3px}
h3{font:800 12.5pt/1.2 M,sans-serif;color:${NAVY};margin:.2in 0 .08in;page-break-after:avoid}
h3:first-of-type{margin-top:0}
p{margin:.06in 0}
.lead{font:600 12pt/1.45 I,sans-serif;color:${INK};margin-bottom:.12in}
ul,ol{margin:.06in 0 .06in .22in}
li{margin:.04in 0;padding-left:.03in}
li::marker{color:${NAVY};font-weight:700}
.big{background:${NAVY};color:#fff;border-radius:10px;padding:.2in .26in;margin:.14in 0;page-break-inside:avoid}
.big .k{font:800 9pt/1 M,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:${GOLD}}
.big p{font:800 15pt/1.3 M,sans-serif;margin:.08in 0 0}
.note{border-left:4px solid ${GOLD};background:#fff8eb;padding:.1in .16in;border-radius:0 8px 8px 0;margin:.12in 0;page-break-inside:avoid}
.note.stop{border-color:#c2410c;background:#fff1ec}
.note b.t{display:block;font:800 9.5pt/1.2 M,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:${NAVY};margin-bottom:.03in}
.note.stop b.t{color:#9a3412}
table{width:100%;border-collapse:separate;border-spacing:0;margin:.1in 0 .14in;font-size:9.5pt;line-height:1.4;page-break-inside:auto}
tr{page-break-inside:avoid}
th{background:${NAVY};color:#fff;font:700 9pt/1.3 I,sans-serif;text-align:left;padding:.07in .1in;letter-spacing:.02em}
th:first-child{border-top-left-radius:8px}th:last-child{border-top-right-radius:8px}
td{padding:.055in .1in;border-bottom:1px solid #dfe5f0;vertical-align:top}
tr:nth-child(even) td{background:${TINT}}
td:first-child{font-weight:700;color:${NAVY}}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:.2in;margin:.1in 0}
.box{border:1.5px solid #cfd8ea;border-radius:10px;padding:.14in .18in;page-break-inside:avoid}
.box h4{font:800 11pt/1.2 M,sans-serif;margin-bottom:.06in}
.box.yes h4{color:#15803d}.box.no h4{color:#b91c1c}
.box ul{margin-left:.18in}
.script{counter-reset:s;list-style:none;margin:.1in 0}
.script>li{counter-increment:s;position:relative;padding:.08in .14in .08in .62in;margin:0 0 .06in;background:${TINT};border-radius:10px;page-break-inside:avoid}
.script>li:before{content:counter(s);position:absolute;left:.14in;top:.1in;width:.32in;height:.32in;border-radius:50%;background:${GOLD};color:${NAVY};font:800 11pt/.32in M,sans-serif;text-align:center}
.script>li>b:first-child{display:block;font:800 10.5pt/1.3 M,sans-serif;color:${NAVY}}
.say{font-style:italic;color:#24345a}
.script ul{margin:.04in 0 0 .16in}
.check{list-style:none;margin-left:0}
.check li{padding-left:.28in;position:relative}
.check li:before{content:"";position:absolute;left:0;top:.04in;width:.13in;height:.13in;border:1.6px solid ${NAVY};border-radius:3px}
.cards{display:grid;grid-template-columns:1fr 1fr;gap:.22in}
.card{border:1.5px dashed #9aa8c4;border-radius:12px;padding:.16in .18in;page-break-inside:avoid;position:relative}
.card .ch{display:flex;align-items:center;gap:.08in;margin-bottom:.08in}
.card .ch svg{width:.32in;height:.32in;flex:none}
.card .ch b{font:800 11pt/1.15 M,sans-serif;color:${NAVY}}
.card table{font-size:8.6pt;margin:.04in 0 0}
.card td,.card th{padding:.045in .07in}
.card.wide{grid-column:1/-1}
.scissors{font:600 8pt/1 I,sans-serif;color:${MUTED};text-align:center;margin:.06in 0 .14in;letter-spacing:.06em}
.pill{display:inline-block;font:700 8.5pt/1 I,sans-serif;background:${GOLD};color:${NAVY};border-radius:99px;padding:.04in .1in;margin-left:.06in;vertical-align:.02in}
.toc{margin:.2in 0}
.toc div{display:flex;align-items:baseline;gap:.12in;padding:.1in 0;border-bottom:1px solid #dfe5f0;font:600 11pt/1.3 I,sans-serif}
.toc div span:first-child{font:800 12pt/1 M,sans-serif;color:${GOLD};width:.3in}
.toc div em{font-style:normal;color:${MUTED};font-weight:400;margin-left:auto;font-size:9.5pt}
.sign{margin-top:.22in;display:grid;grid-template-columns:2fr 1fr;gap:.4in;page-break-inside:avoid}
.sign div{border-top:1.5px solid ${INK};padding-top:.05in;font:600 8.5pt/1 I,sans-serif;color:${MUTED}}
`;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const say = (s: string) => `<span class="say">“${esc(s)}”</span>`;
const table = (head: string[], rows: string[][]) =>
  `<table><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
const chap = (n: number, title: string, sub: string, body: string, brk = false) =>
  `<section class="chap${brk ? " brk" : ""}"><div class="chap-head"><div class="num">${n}</div><div><h2>${title}</h2><p>${sub}</p></div></div>${body}</section>`;
const note = (t: string, body: string, stop = false) => `<div class="note${stop ? " stop" : ""}"><b class="t">${t}</b>${body}</div>`;
const ul = (items: string[], cls = "") => `<ul${cls ? ` class="${cls}"` : ""}>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
const card = (title: string, body: string, wide = false) =>
  `<div class="card${wide ? " wide" : ""}"><div class="ch">${logo}<b>${title}</b></div>${body}</div>`;

const cover = (kicker: string, title: string, lede: string, inside: string[]) => `<section class="cover">
  <div class="badge">${logo}</div>
  <div class="co">Underground Associates</div>
  <div class="kicker">${kicker}</div>
  <h1>${title}</h1>
  <p class="lede">${lede}</p>
  <div class="inside"><h3>Inside</h3>${inside.map((i) => `<span>${i}</span>`).join("")}</div>
  <div class="meta"><span>Underground Associates LLC · Cullman County, Alabama</span><span>${EDITION} edition · Internal use</span></div>
</section>`;

// ---- shared content ----

const plansTable = table(
  ["Plan", "Per month", "Who it fits", "What's included"],
  [
    ["Basic", "$49", "Just needs to be found and get calls", "Website on fast, secure hosting · small text, hours and photo updates · tap to call and directions on every page"],
    ["Plus <span class=pill>Lead with this</span>", "$89", "Most businesses; anyone found on Google Maps", "Everything in Basic · monthly visitor report by text · Google Business Profile tune-up · review QR cards for the counter"],
    ["Pro", "$149", "Wants it all handled, or has lots of competition", "Everything in Plus · monthly Google posts and photos · their own domain, bought in their name · business email · priority changes"],
    ["Price list", "$29", "Stock changes daily; not ready for a website", "Live price page · their own board to update from the phone · QR tags · tablet display · no minimum"],
  ],
);
const payTable = table(
  ["Way to pay", "Setup fee", "Good to know"],
  [
    ["12-month plan", "None", "Our default. Billed monthly."],
    ["6-month plan", "None", "Same monthly price, shorter commitment."],
    ["Month to month", "$299 one time", "Cancel any time with 30 days' notice."],
    ["Yearly up front", "None", "12 months for the price of 10."],
  ],
);

const basics = (n: number) =>
  chap(
    n,
    "The basics",
    "What every person on the team must know",
    `<p class="lead">We find local businesses with no website, or only a Facebook page, and build their website <b>before</b> we ever contact them. The owner sees their own finished site, not a sales pitch. If they like it, they pay monthly and we keep it running.</p>
<div class="big"><div class="k">Our one message</div><p>We already built your business a website. Come see it.</p></div>
<h3>Why it works</h3>
<p>The owner doesn't have to imagine anything. Their name, hours, services and phone number are already on a finished site they can scroll on their own phone.</p>
<h3>Plans</h3>${plansTable}
<h3>Ways to pay</h3>${payTable}
<h3>Promises we make (and can keep)</h3>
${ul([
  "Live within <b>3 business days</b> of signing up.",
  "Changes are included: they text us, we do it.",
  "Their name, photos, words and domain <b>belong to them</b>.",
  "Every lead has a private <b>preview link</b> we can text. It works for 14 days and needs no login.",
])}
${note("Always", "Prices are said <b>per month</b>, never per day. If this handbook and the app ever disagree, the app is right: it always has the current prices.")}`,
    true,
  );

const neverSay = `<div class="cols">
<div class="box yes"><h4>We can say</h4>${ul([
  "Your website is already built. See it before you pay anything.",
  "Plans from $49 a month, no setup fee on a 6- or 12-month plan.",
  "Live within 3 business days.",
  "Made for phones: tap to call, directions, open-now hours.",
  "Text us a change and we do it.",
  "Your name, photos, words and domain stay yours.",
  "Local company, here in Cullman.",
])}</div>
<div class="box no"><h4>We never say</h4>${ul([
  "“Page one on Google,” more customers, or any number of calls.",
  "A price per day (“under $2 a day”).",
  "“Free website.” The preview is free; the website is a paid plan.",
  "Anything negative about a competitor or their current site.",
  "A real business's name, logo or photos without written OK.",
  "A quote from a Google review.",
  "A promise about a date we can't keep.",
])}</div></div>`;

const law = note(
  "The law: outreach stays manual",
  `Every call and text is made by a person, one at a time. No robocalls, no auto-dialers, no mass texts (federal TCPA rules). Text a preview link only after the owner says it's OK. Someone asks us to stop: log <b>Not interested</b> and never contact them again.`,
  true,
);

// ---- marketing handbook ----

const marketing = `${cover(
  "Marketing team handbook",
  "Telling Cullman County we built their website.",
  "Who we talk to, what we say, how our brand looks, and the rules every piece of marketing follows.",
  ["The basics", "Who we sell to", "Our message and words", "Brand rules", "The flyer code program", "Offers and the law"],
)}
<section class="chap" style="page-break-before:auto"><div class="chap-head"><div class="num">i</div><div><h2>How to use this handbook</h2><p>Read it once, keep it at your desk</p></div></div>
<div class="toc">
<div><span>1</span>The basics<em>plans, prices, promises</em></div>
<div><span>2</span>Who we sell to<em>the businesses and what they care about</em></div>
<div><span>3</span>Our message<em>what we say, what we never say</em></div>
<div><span>4</span>Brand rules<em>name, logo, colors, voice</em></div>
<div><span>5</span>Flyers and flyer codes<em>the mail-out program</em></div>
<div><span>6</span>Offers and the rules<em>referrals, founding customers, the law</em></div>
<div><span>7</span>Quick reference<em>cut-out cards</em></div>
</div>
${note("Before anything goes out", "Every ad, post, flyer and email is checked against chapter 3 before it's sent. When in doubt, ask the owner.")}
</section>
${basics(1)}
${chap(
  2,
  "Who we sell to",
  "Local, independent businesses in Cullman County",
  `<p class="lead">Independent businesses in Cullman, Hanceville, Arab, Hartselle, Good Hope and Vinemont that have <b>no website</b>, <b>only a Facebook page</b>, or a <b>broken or outdated</b> site. We don't market to chains.</p>
${table(
  ["Kind of business", "What they care about most", "Lead with"],
  [
    ["Restaurants, cafes, food trucks", "Hours, the menu, being found on Maps", "The menu and open-now hours"],
    ["Contractors and trades", "Phone calls and quote requests", "Tap to call and the quote form"],
    ["Salons, barbers, groomers", "Bookings and looking good", "Photos and the book button"],
    ["Auto repair, tires, parts", "Calls and directions", "Tap to call, directions, services"],
    ["Lawn care and cleaning", "Being found by new neighborhoods", "Service area and the quote form"],
    ["Shops, feed, fish and pet stores", "Stock that changes every day", "The live price list and QR tags"],
    ["Tax, insurance, accounting", "Trust and credentials", "Who you'll work with, clear fees"],
    ["Churches and nonprofits", "Service times and first-time visitors", "Service times and plan-a-visit"],
  ],
)}
<h3>What every owner is really asking</h3>
${ul([
  "<b>Will it bring me customers?</b> Show the call button, the Google listing work, and the monthly visitor report (Plus).",
  "<b>Will it be a hassle?</b> No: it's already built, and changes are a text away.",
  "<b>Is this legit?</b> We're local, they see it before paying, and nothing goes live until they say so.",
])}`,
)}
${chap(
  3,
  "Our message",
  "One idea, said plainly, every time",
  `<div class="big"><div class="k">Headline</div><p>We already built your business a website.</p></div>
<p>Every piece of marketing points the owner to <b>their own finished site</b>. Supporting lines, in order of strength:</p>
${ul([
  "It's finished and waiting for you to look. Free to see, nothing to sign.",
  "Made for phones: one tap to call you, one tap for directions.",
  "Plans from $49 a month. No setup fee on a 6- or 12-month plan.",
  "Live within 3 business days. Changes when you text us.",
  "Local people, right here in Cullman.",
])}
<h3>Words to use and avoid</h3>${neverSay}
${table(
  ["Say", "Instead of"],
  [
    ["Your website is already built", "Free website"],
    ["$89 a month", "Under $3 a day"],
    ["Built to show up on Google", "Page one on Google / guaranteed customers"],
    ["Text us a change and we do it", "Log in and edit it yourself"],
    ["Your domain, in your name", "Our domain"],
    ["Get found, get the phone ringing", "SEO, conversions, digital presence"],
  ],
)}`,
)}
${chap(
  4,
  "Brand rules",
  "How Underground Associates looks and sounds",
  `<div class="cols">
<div class="box"><h4>Name</h4><p><b>Underground Associates</b> in everything public. Legal name: Underground Associates LLC (contracts and invoices only). “UA” is for the app and the badge, never in ads.</p></div>
<div class="box"><h4>Logo</h4><p>The round UA badge. Never stretch it, recolor it, add effects, or redraw it. Give it room: at least a quarter of its width clear on every side. Files are in the app's brand folder.</p></div>
</div>
<h3>Colors</h3>
${table(
  ["Use", "Navy", "Gold / orange"],
  [
    ["Screens (web, social, ads)", "#14213d", "#fca311"],
    ["Print (flyers, cards, handbooks)", "#1d3d8f", "#f59e0b"],
  ],
)}
${note("Why two navies", "The screen navy prints gray on office printers. Anything printed uses the print colors.")}
<h3>Type</h3>
<p>Headlines: Montserrat or Bricolage Grotesque, extra bold. Body text: Inter. Never more than two fonts on one piece.</p>
<h3>Voice</h3>
${ul([
  "A friendly neighbor, not a salesperson.",
  "Plain words and short sentences. No jargon.",
  "Specific beats clever: “$49 a month” beats “affordable.”",
  "Confident, never pushy. No countdown timers or fake urgency.",
])}
<h3>Where we live online</h3>
${table(
  ["What", "Address", "Public?"],
  [
    ["Company website", "undergroundassociates.com", "Yes"],
    ["Flyer code page", "undergroundassociates.com/code", "Yes"],
    ["Facebook", "facebook.com/undergroundassociates", "Yes"],
    ["Team app", "app.undergroundassociates.com", "Never put it on public material"],
  ],
)}`,
)}
${chap(
  5,
  "Flyers and flyer codes",
  "The mail-out that turns an envelope into a website visit",
  `<p class="lead">Every lead in the app has its own private <b>5-digit flyer code</b>. The flyer says <i>“We already built your business a website”</i> and has a white box where we write that business's code by hand.</p>
<ol class="script">
<li><b>Print and pull the list</b>The owner prints the flyer and downloads the mailing list (Settings → Flyer mail-out). Codes are added to the list automatically.</li>
<li><b>Write the code</b>Write each business's code in its white box, by hand, clearly. Check it twice.</li>
<li><b>Mail it or leave it</b>Mail to the business address, or a caller leaves it at the counter.</li>
<li><b>They type it in</b>The owner types the code at <b>undergroundassociates.com/code</b> and their website comes right up.</li>
<li><b>We call, fast</b>The whole team gets an alert (“typed in their flyer code”). That's the warmest lead we have: call within the day.</li>
</ol>
${note("Never", "Never reuse a code, never write one business's code on another's flyer, and never print codes in a batch without checking them against the list.", true)}
<h3>Other printed pieces</h3>
${table(
  ["Piece", "Who it's for", "Notes"],
  [
    ["Mail-out flyer", "New leads", "With the handwritten code box"],
    ["Leave-behind flyer", "Owner not in / not today", "QR to their own preview, 60 days"],
    ["Review QR cards", "Plus and Pro clients", "For their counter"],
    ["Table tents, window sign", "Live restaurant and shop clients", "Point at their menu or site"],
  ],
)}`,
)}
${chap(
  6,
  "Offers and the rules",
  "What we can promote, and what the law requires",
  `<h3>Offers</h3>
${table(
  ["Offer", "How it works", "Before you advertise it"],
  [
    ["Referrals", "A client who sends us a business gets 2 months of their own plan free once the new client pays for a 6- or 12-month plan. Up to 2 a year; extras carry over.", "Always on"],
    ["Founding customers", "The first 5 paying clients pick one free extra: Get listed everywhere, Google Business Profile setup, or a Spanish version.", "Check spots left in the app"],
    ["Pay yearly", "12 months for the price of 10.", "Always on"],
    ["Churches", "Yearly is 12 months for the price of 8; check or bank transfer allowed.", "Churches only"],
  ],
)}
<h3>The rules</h3>
${law}
${ul([
  "Mail and flyers can go to any business address.",
  "Google photos and Google review text never appear in our marketing or on a client's live site.",
  "Example sites use made-up business names. Check any new name against Google before using it.",
  "Testimonials only from real clients, in their own words, with their OK.",
])}`,
)}
${chap(
  7,
  "Quick reference",
  "Cut along the dashed lines and keep at your desk",
  `<div class="cards">
${card("Our message", `<p style="font:800 13pt/1.3 M,sans-serif;color:${NAVY}">We already built your business a website.</p>${ul(["Free to see, nothing to sign", "From $49 a month", "No setup fee on 6 or 12 months", "Live in 3 business days", "Local, here in Cullman"])}`)}
${card("Never say", ul(["Page one / guaranteed customers", "Per-day prices", "“Free website”", "Bad words about competitors", "Real names, logos or photos without OK", "Google reviews or Google photos"]))}
${card("Plans", table(["Plan", "/mo", "Fits"], [["Basic", "$49", "Get found"], ["Plus", "$89", "Most businesses"], ["Pro", "$149", "Done for you"], ["Price list", "$29", "Daily stock"]]))}
${card("Brand", table(["", "Screen", "Print"], [["Navy", "#14213d", "#1d3d8f"], ["Gold", "#fca311", "#f59e0b"]]) + `<p style="font-size:8.6pt;margin-top:.06in">Montserrat / Bricolage headlines · Inter body · UA badge, never altered</p>`)}
</div><p class="scissors">- - - - - cut here - - - - -</p>
${note("Questions?", `Ask the owner, or call the office at ${phone}.`)}`,
  true,
)}`;

// ---- caller handbook ----

const callers = `${cover(
  "Caller handbook",
  "On the phone and at the door.",
  "Everything you need to show a business their new website, answer their questions, and sign them up, on a call or in person.",
  ["The basics", "Before you start", "On the phone", "In person", "Signing up and payment", "Objection answers", "Logging and follow-up", "Cut-out cards"],
)}
<section class="chap" style="page-break-before:auto"><div class="chap-head"><div class="num">i</div><div><h2>How to use this handbook</h2><p>Read it all once, then keep the cards with you</p></div></div>
<div class="toc">
<div><span>1</span>The basics<em>plans, prices, promises</em></div>
<div><span>2</span>Before you start<em>prep in two minutes</em></div>
<div><span>3</span>On the phone<em>the call, step by step</em></div>
<div><span>4</span>In person<em>the walk-in, step by step</em></div>
<div><span>5</span>Signing up and payment<em>on your phone, in three minutes</em></div>
<div><span>6</span>Objection answers<em>what they say, what you say</em></div>
<div><span>7</span>Logging and follow-up<em>every call, every time</em></div>
<div><span>8</span>Cut-out cards<em>for your pocket</em></div>
</div>
${note("The golden rules", ul(["Be friendly and honest. Never promise rankings, customers or dates.", "Text a preview link only after they say it's OK.", "Never take a card number by phone or write one down.", "Log every call and visit before the next one.", "A second no is a no."]))}
<div class="sign"><div>Caller name and signature: I've read this handbook</div><div>Date</div></div>
</section>
${basics(1)}
${chap(
  2,
  "Before you start",
  "Two minutes of prep makes you sound like you know them, because you do",
  `<ul class="check">
<li>Open the lead and read the <b>Call guide</b>. It's written for this business: what their site has and what they'll likely ask.</li>
<li>Tap <b>Preview</b>. Know three things on their site: the call button, their hours, their services or menu.</li>
<li>Read the lead's <b>reason line</b>: no website, Facebook only, a broken site, or a page somewhere else.</li>
<li>Read the <b>call log</b> so you don't repeat what a teammate already said.</li>
<li>Check the <b>“Ask for”</b> name and the best time, if someone saved one.</li>
<li>Going in person? Open the <b>In-person guide</b> for the best time of day and the walk-in script.</li>
</ul>
${note("Hot leads first", "The <b>Up next</b> card on Home puts the most important leads on top: payments to finish, callbacks due, and anyone who just opened their preview. A preview-opened alert means call now, while it's fresh.")}
<h3>Which plan fits?</h3>
${table(
  ["If they…", "Suggest"],
  [
    ["Have a tight budget or only want the basics", "Basic"],
    ["Get most customers from Google or Maps", "Plus"],
    ["Want proof it's working", "Plus (monthly report)"],
    ["Want it all done for them, or have lots of competition", "Pro"],
    ["Want a business email (info@theirbusiness.com)", "Pro"],
    ["Want their own .com", "Any plan: they buy it, or we buy it in their name (free on Pro)"],
    ["Have stock that changes every day", "Price list, or any plan (the price list is included)"],
  ],
)}`,
)}
${chap(
  3,
  "On the phone",
  "The goal of the first call is one thing: permission to text their preview",
  `<ol class="script">
<li><b>Say hello</b>${say("Hi, is this the owner? This is [your name] with Underground Associates, here in Cullman. Do you have one minute?")}</li>
<li><b>Say why you're calling</b>Pick the line that matches the lead's reason:
<ul>
<li><b>No website:</b> ${say("I noticed [business] doesn't have a website, so I went ahead and built you one. It's already done.")}</li>
<li><b>Facebook only:</b> ${say("I saw your Facebook page and built you a real website that shows up on Google too. It links to your Facebook.")}</li>
<li><b>Broken or old site:</b> ${say("I pulled up your website and it doesn't work well on a phone, so I built you a new one.")}</li>
<li><b>Page on another site:</b> ${say("I found you listed on another site, but you don't have your own, so I built you one.")}</li>
</ul></li>
<li><b>Ask to text it</b>${say("Can I text you the link so you can see it? It takes one minute, no cost to look.")}</li>
<li><b>Text it</b>Use the app's <b>Text preview link</b> button. Stay on the line while they open it if they're willing.</li>
<li><b>Show three things only</b>The call button, their hours, their services or menu. ${say("Anything I got wrong? I'll fix it right now.")}</li>
<li><b>Ask one question</b>${say("How do most new customers find you right now?")} Listen. Their answer tells you the plan.</li>
<li><b>Give the price, once they've seen it</b>${say("Most folks pick Plus. It's $89 a month, no setup fee on the 12-month plan, and it's live within 3 business days.")}</li>
<li><b>Ask for the yes</b>${say("Want me to get it going for you?")}</li>
<li><b>Log it</b>Before you dial the next number. See chapter 7.</li>
</ol>
<h3>Not today</h3>
${table(
  ["They say", "You do"],
  [
    ["Call me another day", "“Can I check back Thursday?” Log <b>Call back</b> with that day."],
    ["Let me ask my spouse or partner", "Text the link so they can show them, then set the callback."],
    ["Just send me something", "Text the preview. It's better than a brochure."],
    ["No (the second time)", "Thank them, log <b>Not interested</b> with the honest reason. Done."],
  ],
)}`,
)}
${chap(
  4,
  "In person",
  "You hand the owner a phone with their own finished website on it",
  `<h3>When to walk in</h3>
${table(
  ["Business", "Best time", "Avoid"],
  [
    ["Restaurants", "2 to 4 PM, between lunch and dinner", "Rushes, opening, right before closing"],
    ["Salons, barbers, groomers", "Weekday mid-morning, between clients", "When they're with a client"],
    ["Contractors and trades", "7 to 8 AM at the shop, or late afternoon", "Midday; call first if there's no shop"],
    ["Auto repair", "Weekday mid-morning or mid-afternoon", "Opening drop-offs, closing pick-ups"],
    ["Lawn care", "Early morning, or a rainy day", "Midday; call first if there's no shop"],
    ["Cleaning services", "Call first and ask for 5 minutes", "Dropping in unannounced"],
    ["Print and sign shops", "Late morning or early afternoon", "Deadline days (Fridays before games)"],
    ["Shops and retail", "Weekday after opening, or mid-afternoon", "Sales, busy Saturdays"],
    ["Churches", "Tuesday to Thursday mornings", "Sundays, services, Wednesday afternoons"],
    ["Tax and insurance", "Tax offices May to Dec; insurance mid-morning", "Tax offices January to mid-April"],
  ],
)}
<h3>What to bring</h3>
<ul class="check">
<li>Phone charged, app signed in, their preview already open.</li>
<li>Two or three flyers with their code written in the box.</li>
<li>This handbook's cut-out cards.</li>
<li>Tap to Pay ready: NFC and Location on, Developer options off.</li>
</ul>
<h3>The walk-in</h3>
<ol class="script">
<li><b>Say hello</b>${say("Hi, I'm [your name] with Underground Associates, here in Cullman. Is the owner in? I only need a couple of minutes.")} Not in? Ask when they will be, leave a flyer, log <b>Owner not in</b>.</li>
<li><b>Say why you're here</b>${say("I build websites for local businesses, and I already made one for you. Can I show you? It takes one minute.")}</li>
<li><b>Hand them the phone</b>Let them scroll. Point at the call button, their hours and directions, and their services or menu.</li>
<li><b>Fix something live</b>When they say ${say("we close at 7 now")}, tap <b>Edit</b>, fix it, <b>Save</b>. It updates in seconds. That's when they believe it's real.</li>
<li><b>Ask questions</b>${say("How do new customers find you now? Do people call just to ask your hours?")}</li>
<li><b>Take a photo</b>Of the storefront, truck or shop (Edit → Photo). We can't publish Google's photo, so theirs replaces it.</li>
<li><b>Give the price and ask for the yes</b>${say("Most folks pick Plus, $89 a month, no setup fee on the 12-month plan. Want to get it going today?")}</li>
<li><b>Log it on the spot</b><b>Talked in person</b>, plus a one-line note.</li>
</ol>
${note("Not today?", `Leave a flyer: ${say("Type this code at undergroundassociates.com/code tonight and your site comes right up.")} Text the preview if they say OK. Log <b>Left a flyer</b> or <b>Call back</b>. Never leave without a flyer, a text or a callback.`)}
<h3>At the door, always</h3>
${ul([
  "Keep it under 5 minutes unless they keep talking.",
  "Step aside when a customer walks up. Their customers come first.",
  "Don't knock their current site or whoever made it.",
  "Leave on good terms. Plenty of people say yes on the second visit.",
])}`,
)}
${chap(
  5,
  "Signing up and payment",
  "The whole sale happens on your phone in about three minutes",
  `<ol class="script">
<li><b>Show the plans</b>Tap <b>Show plans</b> and let them read. It's customer-facing: no notes, no commission.</li>
<li><b>Start the sign-up</b>Tap <b>Sign them up: Plus, 12-month</b>, or <b>Change plan or way to pay</b>. Add any extras they want.</li>
<li><b>Ask about their web address</b>Free address that comes with every plan · a domain they buy or already own · or we buy it for them in their name (included with Pro). Either way, it's theirs.</li>
<li><b>They sign</b>Hand them the phone. They type their full name, draw their signature, and agree. Want them to read it first? <b>Show them the agreement</b>, or give them the PDF.</li>
<li><b>Take payment</b>In person: <b>Tap card on this phone</b> (they tap their card on the back of your phone), or type it on the secure payment sheet. On the phone: text them the sign-up link and they pay on a secure page.</li>
<li><b>Done</b>The lead turns Sold and the team gets an alert. Tell them: ${say("You'll be live within 3 business days.")}</li>
</ol>
${note("Never", "Never take a card number over the phone, never write one down, never take cash for a plan. Every payment goes through the app's secure page or Tap to Pay.", true)}
<h3>Practice first</h3>
<p>The lead named <b>“Payment test (not a real business)”</b> lets you run a whole sign-up and a real $1 payment. The owner resets it afterward. Do it once before your first real sale.</p>`,
)}
${chap(
  6,
  "Objection answers",
  "Listen fully, agree with the feeling, answer the real question",
  table(
    ["They say", "You say"],
    [
      ["Word of mouth keeps us busy.", "That's the best kind. When someone hears about you, the first thing they do is look you up on their phone. This makes sure they find your number and hours, not the place down the road."],
      ["I already have a Facebook page.", "Keep it! The site links to it. But lots of people aren't on Facebook, and Facebook pages don't show up well on Google. This one's yours and works for everybody."],
      ["It's too expensive.", "I hear you. Basic is $49 a month with no setup fee on the 6- or 12-month plan. If it brings you one customer a month, it pays for itself. You can move up any time."],
      ["I don't want a contract.", "No problem. There's a 6-month plan, same price, no setup fee. Or month to month: a one-time $299 setup, cancel any time with 30 days' notice."],
      ["I need to think about it.", "Of course. Is it the price, or whether it'll bring in business? (Answer that.) I'll text you the link to look at tonight. Can I check back Thursday?"],
      ["I need to ask my spouse or partner.", "Makes sense. I'll text you the link so you can show them. When's a good time to check back after you've both looked?"],
      ["Just send me some information.", "Better than a brochure, I'll text you your actual website. It only takes a minute to look at."],
      ["My nephew can build me one.", "That works for some folks. We keep it running every month, with changes when you text, and yours is already built. You can see it right now."],
      ["I already have a website.", "Name what's wrong with it: it doesn't load, or it's hard to use on a phone. If they own the domain, it stays theirs; we just point it at the new site."],
      ["I'm too busy for this.", "That's the point: it's already built. I just need a few minutes to check your hours and services. After that, you text us changes."],
      ["I'm not good with computers.", "You don't have to be. We do all of it. Want something changed? Text us like you'd text a friend."],
      ["Is this a scam?", "Fair question. We're local, here in Cullman. You see your site before paying anything, nothing goes live until you say so, and I never take card numbers by hand."],
      ["Do I own it? What if I cancel?", "Your name, logo, photos and text are always yours, and a domain you own stays in your name. We'll send you a copy of your site's files if you leave."],
      ["Can you guarantee more customers?", "Nobody honest can promise that. It's built to show up on Google and make calling you easy, and Plus texts you every month how many people looked and called."],
      ["Do I need a domain name?", "Three choices: the free address that comes with every plan, buy your own for $10 to $15 a year and we hook it up, or we buy it for you in your name (included with Pro)."],
      ["Why does it cost money every month?", "It covers hosting, security, keeping it working on new phones, and your changes. No surprise bills. Pay for the year and get 2 months free."],
      ["Do you have a referral program?", "Yes. Send us a business that signs up for 6 or 12 months and you get 2 months of your plan free, up to 2 a year."],
      ["We'll take it to the deacons. (churches)", "Of course. Can I leave this for that meeting? When do you meet? I'll check back the day after."],
      ["Not interested.", "No problem at all. I built it for you either way. Can I text you the link in case you change your mind? Then thank them and go."],
    ],
  ),
)}
${chap(
  7,
  "Logging and follow-up",
  "If it isn't logged, a teammate calls them again tomorrow",
  `${table(
    ["What happened", "Tap this", "What the app does"],
    [
      ["Nobody picked up", "No answer", "Callback set for tomorrow"],
      ["Talked on the phone", "Reached", "Add a callback day if they asked"],
      ["Owner wasn't in (visit)", "Owner not in", "Callback set for tomorrow"],
      ["Talked face to face", "Talked in person", "Books the next follow-up step"],
      ["Left a flyer", "Left a flyer", "Marks them Shown, callback in 2 days"],
      ["Saw it, wants to think", "Interested", "Marks them Shown, callback in 2 days"],
      ["Asked for another day", "Call back", "You pick the day"],
      ["Said yes", "Sold", "Clears the callback"],
      ["Said no", "Not interested", "Asks why, clears the callback"],
    ],
  )}
<p>Add <b>one line of notes</b> every time: who you spoke to and what to try next. Pick the honest reason on Not interested.</p>
<h3>Follow-up schedule after they've seen it</h3>
${table(
  ["When", "Do this"],
  [
    ["Day 2", "Call"],
    ["Day 5", "Text (use the Follow-up texts button)"],
    ["Day 10", "Stop by in person"],
    ["Day 21", "One last friendly text, then let it rest"],
  ],
)}
<p style="font-size:9pt;color:${MUTED}"><b>Help:</b> Training and Plans &amp; answers are in the app · Office ${phone} · Something broken? Tap “Report this.”</p>`,
)}
${chap(
  8,
  "Cut-out cards",
  "Cut along the dashed lines and keep them in your pocket or car",
  `<div class="cards">
${card("Plans", table(["Plan", "/mo", "Fits"], [["Basic", "$49", "Get found, get calls"], ["Plus", "$89", "Most businesses"], ["Pro", "$149", "All done for them"], ["Price list", "$29", "Daily stock, no site"]]) + `<p style="font-size:8.4pt;margin-top:.06in">No setup fee on 6 or 12 months · Month to month +$299 once · Yearly = 12 for 10 · Live in 3 business days</p>`)}
${card("The phone call", `<ol style="font-size:8.8pt;margin-left:.18in">${["Hello + one minute?", "Why you're calling (reason line)", "Can I text you the link?", "Show call button, hours, services", "How do customers find you?", "Plus, $89, no setup on 12 months", "Want me to get it going?", "Log it"].map((s) => `<li>${s}</li>`).join("")}</ol>`)}
${card("At the door", `<ol style="font-size:8.8pt;margin-left:.18in">${["Is the owner in? 2 minutes", "I already built you a website", "Hand them the phone", "Fix one thing live", "Ask questions, take a photo", "Price, then ask for the yes", "Sign + Tap to Pay, or flyer", "Log it on the spot"].map((s) => `<li>${s}</li>`).join("")}</ol>`)}
${card("Quick answers", table(["They say", "Short answer"], [["Facebook", "Keep it, we link to it"], ["Too much", "$49, one customer pays for it"], ["Contract", "6 months, or month to month"], ["Think about it", "Price or results? Thursday?"], ["Scam?", "Local, see it first, no cards by hand"], ["Not interested", "Leave the link, thank them, go"]]))}
${card("Log every call", table(["Phone", "In person", "Result"], [["No answer", "Owner not in", "Interested"], ["Reached", "Talked in person", "Call back"], ["", "Left a flyer", "Sold / Not interested"]]) + `<p style="font-size:8.4pt;margin-top:.06in">Follow up: day 2 call · day 5 text · day 10 visit · day 21 last text</p>`, true)}
</div><p class="scissors">- - - - - cut here - - - - -</p>`,
  true,
)}`;

const doc = (body: string) => `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`;
const footer = (label: string) =>
  `<div style="width:100%;font:600 7.5pt Helvetica,Arial,sans-serif;color:#7a869c;padding:0 .7in;display:flex;justify-content:space-between"><span>Underground Associates · ${label}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`;

await mkdir(outDir, { recursive: true });
const browser = await chromium
  .launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" })
  .catch(() => chromium.launch());
for (const [file, label, body] of [
  ["UA-Marketing-Training.pdf", "Marketing team handbook", marketing],
  ["UA-Caller-Training.pdf", "Caller handbook", callers],
] as const) {
  const page = await browser.newPage({ viewport: { width: 816, height: 1056 } });
  await page.setContent(doc(body), { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const pdf = await page.pdf({
    width: "8.5in",
    height: "11in",
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate: footer(label),
  });
  await writeFile(join(outDir, file), pdf);
  if (pngDir) {
    await mkdir(pngDir, { recursive: true });
    await page.emulateMedia({ media: "print" });
  }
  await page.close();
  console.log(`wrote ${join(outDir, file)}`);
}
await browser.close();
