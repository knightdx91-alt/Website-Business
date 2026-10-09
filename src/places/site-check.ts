const CHALLENGE = /cf-mitigated|Just a moment|challenge-platform|_Incapsula_|cf-chl|Checking your browser|Attention Required! \| Cloudflare/i;

/** Looks at a business's existing website and says what's wrong with it, if anything. Returns null for a decent site. */
export async function websiteProblem(url: string, now = new Date()): Promise<string | null> {
  let res: Response;
  try {
    res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(7000),
      headers: { "user-agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Mobile Safari/537.36", accept: "text/html" },
    });
  } catch {
    return "Website doesn't load";
  }
  if (res.status >= 500) {
    // Cloudflare, Wix and Imperva answer bots with a 503 "Just a moment…" challenge page. The site is fine; we just can't read it.
    if (res.status === 503) {
      const body = await res.text().catch(() => "");
      if (res.headers.get("cf-mitigated") || CHALLENGE.test(body)) return null;
    }
    return "Website is down";
  }
  if (res.status === 404 || res.status === 410) return "Website page is missing";
  if (res.status >= 400) return null; // 401/403 often means bot blocking, not a broken site.
  const finalUrl = res.url || url;
  const text = (await res.text()).slice(0, 400_000);
  if (/domain (?:is |may be )?for sale|buy this domain|this domain has expired|parked free|domain parking|sedoparking|hugedomains/i.test(text)) return "Website domain is parked or expired";
  if (text.length < 400 && !/<script/i.test(text)) return "Website is nearly empty";
  if (finalUrl.startsWith("http:")) return "Website isn't secure (no https)";
  if (!/<meta[^>]+name=["']?viewport/i.test(text)) return "Website isn't made for phones";
  const years = [...text.matchAll(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})/gi)].map((m) => Number(m[1])).filter((y) => y > 1995 && y <= now.getFullYear());
  if (years.length) {
    const latest = Math.max(...years);
    if (latest <= now.getFullYear() - 4) return `Website looks out of date (© ${latest})`;
  }
  return null;
}
