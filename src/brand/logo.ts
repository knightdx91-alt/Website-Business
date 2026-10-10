/**
 * The Underground Associates badge as a vector, rebuilt from the owner's logo file
 * (app/public/brand/logo-original-512.png) so it renders sharp at any size.
 * Geometry is in a 512-unit frame with the disc centered at (256, 256).
 * Fonts: Montserrat 800 ("UA") and 700 (everything else); the renderer must load them
 * (scripts/brand.ts embeds them; see FONT_CSS).
 */
export const NAVY = "#14213d";
export const ORANGE = "#fca311";

export type LogoBackground = "disc" | "white" | "navy";

/** `disc`: the navy circle on a transparent background (the logo itself). `white`/`navy`: a square card behind it. */
export function logoSvg(opts: { bg?: LogoBackground; size?: number; pad?: number } = {}): string {
  const bg = opts.bg ?? "disc";
  const size = opts.size ?? 512;
  const pad = opts.pad ?? (bg === "disc" ? 0 : 40);
  const frame = 512 + pad * 2;
  const navyFill = bg === "white" ? NAVY : "#fff";
  const arcTop = "M 256 256 m -219 0 a 219 219 0 1 1 438 0";
  // Left to right along the bottom (sweep 0), so the letters stand upright like the original.
  const arcBottom = "M 256 256 m -219 0 a 219 219 0 0 0 438 0";
  // Dots sit just below the horizontal, where the two arcs meet.
  const dotY = 256 + 219 * Math.sin((6.7 * Math.PI) / 180);
  const dotX = 219 * Math.cos((6.7 * Math.PI) / 180);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${frame} ${frame}" width="${size}" height="${size}" role="img" aria-label="Underground Associates">
${bg === "white" ? `<rect width="${frame}" height="${frame}" fill="#fff"/>` : bg === "navy" ? `<rect width="${frame}" height="${frame}" fill="${NAVY}"/>` : ""}
<g transform="translate(${pad} ${pad})" font-family="Montserrat, system-ui, sans-serif">
${bg === "white" ? "" : `<circle cx="256" cy="256" r="256" fill="${NAVY}"/>`}
<circle cx="256" cy="256" r="160" fill="none" stroke="${ORANGE}" stroke-width="8"/>
<defs><path id="ua-top" d="${arcTop}"/><path id="ua-bottom" d="${arcBottom}"/></defs>
<text fill="${navyFill}" font-weight="700" font-size="39" letter-spacing="3"><textPath href="#ua-top" startOffset="50%" text-anchor="middle" dominant-baseline="central">UNDERGROUND ASSOCIATES</textPath></text>
<text fill="${navyFill}" font-weight="700" font-size="39" letter-spacing="3"><textPath href="#ua-bottom" startOffset="50%" text-anchor="middle" dominant-baseline="central">CULLMAN, ALABAMA</textPath></text>
<circle cx="${(256 - dotX).toFixed(1)}" cy="${dotY.toFixed(1)}" r="7" fill="${ORANGE}"/><circle cx="${(256 + dotX).toFixed(1)}" cy="${dotY.toFixed(1)}" r="7" fill="${ORANGE}"/>
<text x="256" y="286" fill="${navyFill}" font-weight="800" font-size="136" text-anchor="middle" letter-spacing="-2">UA</text>
<rect x="184" y="308" width="144" height="11" rx="5.5" fill="${ORANGE}"/>
<text x="256" y="361" fill="${navyFill}" font-weight="700" font-size="22" text-anchor="middle" letter-spacing="6">EST. 2021</text>
</g></svg>`;
}

/** Badge beside the name, for wide spots (Google Ads 4:1 logo, website header). */
export function lockupSvg(opts: { bg?: "white" | "navy"; width?: number } = {}): string {
  const bg = opts.bg ?? "white";
  const width = opts.width ?? 1200;
  const height = Math.round(width / 4);
  const ink = bg === "white" ? NAVY : "#fff";
  const badge = logoSvg({ bg: "disc" }).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 300" width="${width}" height="${height}" role="img" aria-label="Underground Associates">
<rect width="1200" height="300" fill="${bg === "white" ? "#fff" : NAVY}"/>
<g transform="translate(60 30) scale(0.46875)">${badge}</g>
<text x="340" fill="${ink}" font-family="Montserrat, system-ui, sans-serif" font-weight="800" font-size="88" letter-spacing="-1"><tspan x="340" y="138">Underground</tspan><tspan x="340" y="232" fill="${ORANGE}">Associates</tspan></text>
</svg>`;
}
