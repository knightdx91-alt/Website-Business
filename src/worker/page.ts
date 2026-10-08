/** Small standalone pages the Worker serves to business owners (sign-up, printable cards). */

export function escHtml(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const BASE_CSS = `*{box-sizing:border-box}body{margin:0;background:#f4f5f8;color:#16181d;font:400 17px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.top{background:#14213d;color:#fff;padding:16px 20px;font-weight:800;font-size:1.05rem}
.wrap{max-width:640px;margin:0 auto;padding:20px 16px 48px}
.card{background:#fff;border:1px solid #e1e4ea;border-radius:14px;padding:20px;margin-bottom:16px}
h1{font-size:1.5rem;line-height:1.2;margin:0 0 8px}h2{font-size:1.1rem;margin:0 0 10px}
.muted{color:#5b6270}.small{font-size:.92rem}.price{font-size:1.6rem;font-weight:800}
ul{padding-left:20px;margin:8px 0}li{margin:4px 0}
.terms{white-space:pre-wrap;font-size:.95rem;background:#f8f9fb;border:1px solid #e1e4ea;border-radius:10px;padding:14px;max-height:320px;overflow:auto}
label{display:grid;gap:6px;font-weight:600;margin-bottom:14px}
input[type=text],input[type=email]{width:100%;min-height:48px;padding:10px 12px;border:2px solid #d5d9e1;border-radius:10px;font:inherit}
.check{display:flex;gap:10px;align-items:flex-start;font-weight:600}.check input{width:22px;height:22px;margin-top:3px;flex:none}
.btn{display:inline-flex;align-items:center;justify-content:center;width:100%;min-height:52px;padding:12px 18px;border:0;border-radius:12px;background:#1d4ed8;color:#fff;font:700 1.05rem system-ui,sans-serif;text-decoration:none;cursor:pointer}
.billing{border:0;padding:0;margin:0 0 14px}.billing legend{font-weight:700;margin-bottom:8px;padding:0}
.opt{display:flex;gap:12px;align-items:flex-start;border:2px solid #d5d9e1;border-radius:12px;padding:12px;margin-bottom:8px;font-weight:400}
.opt input{width:22px;height:22px;margin-top:2px;flex:none}.opt:has(input:checked){border-color:#1d4ed8;background:#f1f5ff}
.btn--ghost{background:#eef1f6;color:#16181d}.btn+.btn{margin-top:10px}.ok{color:#15803d;font-weight:700}
@media print{.noprint{display:none!important}body{background:#fff}}`;

export function page(title: string, body: string, opts: { brand?: string; css?: string; status?: number } = {}): Response {
  const doc = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>${escHtml(title)}</title><style>${BASE_CSS}${opts.css ?? ""}</style></head>
<body>${opts.brand === "" ? "" : `<div class="top noprint">${escHtml(opts.brand || "Website sign-up")}</div>`}${body}</body></html>`;
  return new Response(doc, {
    status: opts.status ?? 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
      "referrer-policy": "no-referrer",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; script-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'self'; base-uri 'none'",
    },
  });
}
