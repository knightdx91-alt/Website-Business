/** Towns around the Cullman, AL starting market, used to draft service areas (owner confirms). */
export const NORTH_AL_TOWNS: Array<{ name: string; lat: number; lng: number }> = [
  { name: "Cullman", lat: 34.1748, lng: -86.8436 },
  { name: "Hanceville", lat: 34.0607, lng: -86.7675 },
  { name: "Good Hope", lat: 34.1157, lng: -86.8636 },
  { name: "Vinemont", lat: 34.2465, lng: -86.8661 },
  { name: "Holly Pond", lat: 34.1715, lng: -86.6164 },
  { name: "Baileyton", lat: 34.2626, lng: -86.6111 },
  { name: "Fairview", lat: 34.2459, lng: -86.6936 },
  { name: "Dodge City", lat: 34.0418, lng: -86.8955 },
  { name: "Garden City", lat: 33.9926, lng: -86.7464 },
  { name: "West Point", lat: 34.2373, lng: -86.9606 },
  { name: "Colony", lat: 33.9426, lng: -86.8941 },
  { name: "Joppa", lat: 34.2768, lng: -86.5536 },
  { name: "Falkville", lat: 34.3687, lng: -86.9086 },
  { name: "Hartselle", lat: 34.4434, lng: -86.9353 },
  { name: "Arab", lat: 34.3281, lng: -86.4958 },
  { name: "Addison", lat: 34.2004, lng: -87.1781 },
  { name: "Oneonta", lat: 33.9482, lng: -86.4728 },
  { name: "Blountsville", lat: 34.0812, lng: -86.5911 },
  { name: "Jasper", lat: 33.8312, lng: -87.2775 },
  { name: "Decatur", lat: 34.6059, lng: -86.9833 },
];

export function milesBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function townsWithin(center: { lat: number; lng: number }, radiusMiles: number, max = 10): string[] {
  return NORTH_AL_TOWNS.map((t) => ({ t, d: milesBetween(center, t) }))
    .filter((x) => x.d <= radiusMiles)
    .sort((a, b) => a.d - b.d)
    .slice(0, max)
    .map((x) => x.t.name);
}
