import { hasAnyHours, openingHoursSpecification } from "./hours.ts";
import type { Ctx } from "./components.ts";

export function originFor(ctx: Ctx): string {
  return ctx.site.origin ?? `https://${ctx.site.slug}.pages.dev`;
}

/** The one LocalBusiness-family node for the site. Other pages reference it by @id. */
export function businessNode(ctx: Ctx, type: string | string[], extras: Record<string, unknown> = {}): Record<string, unknown> {
  const r = ctx.r;
  const origin = originFor(ctx);
  const sameAs = [r.mapsUrl, ...Object.values(r.links.social).filter(Boolean)];
  const address: Record<string, unknown> = {
    "@type": "PostalAddress",
    addressLocality: r.address.city,
    addressRegion: r.address.state,
    addressCountry: "US",
  };
  if (r.showStreetAddress && r.address.street) address.streetAddress = r.address.street;
  if (r.address.zip) address.postalCode = r.address.zip;

  const node: Record<string, unknown> = {
    "@type": type,
    "@id": `${origin}/#business`,
    name: r.name,
    url: `${origin}/`,
    telephone: r.phone.e164,
    address,
    geo: { "@type": "GeoCoordinates", latitude: r.geo.lat, longitude: r.geo.lng },
    sameAs,
  };
  if (hasAnyHours(r.hours)) node.openingHoursSpecification = openingHoursSpecification(r.hours);
  if (r.foundedYear) node.foundingDate = String(r.foundedYear);
  if (r.serviceArea?.towns.length) {
    node.areaServed = r.serviceArea.towns.map((t) => ({ "@type": "City", name: `${t}, ${r.address.state}` }));
  }
  const images = [r.media.hero, r.media.logo].filter((i) => i && i.source !== "google");
  if (images.length) node.image = images.map((i) => new URL(i!.src, origin).toString());
  // A church's "services" are ministries, not offers for sale.
  if (r.services.length && r.category !== "church") {
    node.hasOfferCatalog = {
      "@type": "OfferCatalog",
      name: "Services",
      itemListElement: r.services.map((s) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: s.name } })),
    };
  }
  return { ...node, ...extras };
}

export function websiteNode(ctx: Ctx): Record<string, unknown> {
  const origin = originFor(ctx);
  return { "@type": "WebSite", "@id": `${origin}/#website`, url: `${origin}/`, name: ctx.r.name, publisher: { "@id": `${origin}/#business` } };
}

export function webPageNode(ctx: Ctx, path: string, name: string, crumb?: string): Record<string, unknown>[] {
  const origin = originFor(ctx);
  const page: Record<string, unknown> = {
    "@type": "WebPage",
    "@id": `${origin}${path}#webpage`,
    url: `${origin}${path}`,
    name,
    isPartOf: { "@id": `${origin}/#website` },
    about: { "@id": `${origin}/#business` },
  };
  if (!crumb) return [page];
  return [
    page,
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
        { "@type": "ListItem", position: 2, name: crumb, item: `${origin}${path}` },
      ],
    },
  ];
}

export function faqNode(items: Array<{ q: string; a: string }>): Record<string, unknown> {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

export function graph(nodes: Array<Record<string, unknown>>): Record<string, unknown> {
  return { "@context": "https://schema.org", "@graph": nodes };
}
