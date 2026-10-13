// Tiny markdown → HTML for the review page: headings, paragraphs, bold, links, bullet + numbered lists, pipe tables.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const [src, outDir] = process.argv.slice(2);
const md = readFileSync(src, "utf8");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (s) => esc(s)
  .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
const lines = md.split("\n");
let html = "", i = 0, title = "";
const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const toc = [];
while (i < lines.length) {
  const l = lines[i];
  if (!l.trim()) { i++; continue; }
  if (l.startsWith("# ")) { title = l.slice(2); html += `<h1>${inline(title)}</h1>\n`; i++; continue; }
  if (l.startsWith("## ")) { const t = l.slice(3); toc.push(t); html += `<h2 id="${slug(t)}">${inline(t)}</h2>\n`; i++; continue; }
  if (l.startsWith("### ")) { html += `<h3>${inline(l.slice(4))}</h3>\n`; i++; continue; }
  if (l.startsWith("| ")) {
    const rows = [];
    while (i < lines.length && lines[i].startsWith("| ")) { rows.push(lines[i]); i++; }
    const cells = (r) => r.slice(1, -1).split(" | ").map((c) => c.trim());
    const head = cells(rows[0]);
    const body = rows.slice(2).map(cells);
    html += `<div class="tw"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${body
      .map((r) => `<tr>${r.map((c, n) => `<td data-h="${esc(head[n] ?? "")}">${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>\n`;
    continue;
  }
  if (/^- /.test(l) || /^\d+\. /.test(l)) {
    const ordered = /^\d+\. /.test(l);
    const items = [];
    while (i < lines.length && (/^- /.test(lines[i]) || /^\d+\. /.test(lines[i]))) { items.push(lines[i].replace(/^(- |\d+\. )/, "")); i++; }
    html += `<${ordered ? "ol" : "ul"}>${items.map((t) => `<li>${inline(t)}</li>`).join("")}</${ordered ? "ol" : "ul"}>\n`;
    continue;
  }
  const para = [];
  while (i < lines.length && lines[i].trim() && !/^(#|\| |- |\d+\. )/.test(lines[i])) { para.push(lines[i]); i++; }
  html += `<p>${inline(para.join(" "))}</p>\n`;
}
const nav = `<nav class="toc" aria-label="Sections"><ol>${toc.map((t) => `<li><a href="#${slug(t)}">${esc(t)}</a></li>`).join("")}</ol></nav>`;
const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${esc(title)}</title>
<meta name="description" content="Underground Associates: the app's first week in numbers, what they say, what the market and the research say, and the changes in order.">
<style>
:root{--bg:#fbfaf7;--surface:#fff;--text:#1d1b17;--muted:#5c574f;--line:#e4e0d6;--accent:#14213d;--accent2:#fca311;--radius:10px}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#15161a;--surface:#1d1f25;--text:#ecebe6;--muted:#aaa69d;--line:#2f323b;--accent:#9db4e3;--accent2:#fca311}}
:root[data-theme="dark"]{--bg:#15161a;--surface:#1d1f25;--text:#ecebe6;--muted:#aaa69d;--line:#2f323b;--accent:#9db4e3;--accent2:#fca311}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:400 17px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;-webkit-text-size-adjust:100%}
main{max-width:860px;margin:0 auto;padding:28px 16px 80px}
h1{font-size:clamp(1.9rem,5vw,2.8rem);line-height:1.1;letter-spacing:-.02em;margin:0 0 .4em;text-wrap:balance}
h2{font-size:clamp(1.35rem,3.4vw,1.8rem);line-height:1.2;margin:2.2em 0 .5em;padding-top:.6em;border-top:3px solid var(--accent2);text-wrap:balance}
h3{font-size:1.1rem;margin:1.6em 0 .4em;color:var(--accent)}
p{margin:0 0 1em;text-wrap:pretty}
h1+p{color:var(--muted);font-size:.95rem}
strong{color:var(--accent)}
a{color:var(--accent);text-underline-offset:.15em}
ul,ol{padding-left:1.3em;margin:0 0 1.1em}li{margin:.3em 0}
.toc{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:12px 16px;margin:18px 0 26px;font-size:.95rem}
.toc ol{margin:0;columns:2;column-gap:24px}.toc li{break-inside:avoid}
@media (max-width:560px){.toc ol{columns:1}}
.tw{overflow-x:auto;margin:0 0 1.2em;border:1px solid var(--line);border-radius:var(--radius);background:var(--surface)}
table{border-collapse:collapse;width:100%;font-size:.93rem}
th,td{text-align:left;vertical-align:top;padding:9px 12px;border-bottom:1px solid var(--line)}
th{background:color-mix(in srgb,var(--accent) 8%,var(--surface));font-weight:700;white-space:nowrap}
tr:last-child td{border-bottom:0}
td:first-child{font-weight:600}
@media (max-width:640px){
 .tw.cards table,.tw.cards thead,.tw.cards tbody,.tw.cards tr,.tw.cards td{display:block}
 .tw.cards thead{position:absolute;left:-9999px}
 .tw.cards tr{border-bottom:8px solid var(--bg)}
 .tw.cards td{border-bottom:1px solid var(--line);padding:8px 12px}
 .tw.cards td::before{content:attr(data-h);display:block;font-size:.75rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:2px}
}
footer{margin-top:60px;color:var(--muted);font-size:.9rem;border-top:1px solid var(--line);padding-top:16px}
</style>
</head>
<body>
<main>
${html.replace(/<h1>[\s\S]*?<\/h1>\n<p>[\s\S]*?<\/p>\n/, (m) => m + nav)}
<footer>Underground Associates LLC, Cullman, Alabama. Internal review; the numbers are from the team's own app. Figures from outside studies carry their source in the tables.</footer>
</main>
<script>
// Wide tables (4+ columns) read as stacked cards on phones.
document.querySelectorAll(".tw").forEach((w) => { if (w.querySelectorAll("th").length >= 4) w.classList.add("cards"); });
</script>
</body>
</html>`;
mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/index.html`, page);
writeFileSync(`${outDir}/_headers`, "/*\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: public, max-age=300\n");
console.log("built", page.length, "bytes;", toc.length, "sections");
