export type Poi = {
  id: string;
  name: string;
  category: string;
  lat: number;
  lon: number;
  address?: string;
};

/* ------------------------------------------------------------------ */
/* OVERPASS (existing frontend-only implementation)                    */
/* ------------------------------------------------------------------ */

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

export async function fetchPoisOverpass(params: {
  query: string;
  center: { lat: number; lon: number };
  radiusM: number;
}): Promise<Poi[]> {
  const { query, center, radiusM } = params;

  const overpassQuery = `
    [out:json][timeout:25];
    (
      node(around:${radiusM},${center.lat},${center.lon})["amenity"~"${query}",i];
      way(around:${radiusM},${center.lat},${center.lon})["amenity"~"${query}",i];
    );
    out center tags;
  `;

  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    body: overpassQuery,
  });

  if (!res.ok) {
    throw new Error("Overpass request failed");
  }

  const json = await res.json();

  return (json.elements || []).map((el: any, idx: number): Poi => {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;

    return {
      id: String(el.id ?? idx),
      name: el.tags?.name ?? "Unknown",
      category: el.tags?.amenity ?? "poi",
      address: el.tags?.["addr:street"],
      lat,
      lon,
    };
  });
}

/* ------------------------------------------------------------------ */
/* BACKEND: GET /pointofinterest                                       */
/* ------------------------------------------------------------------ */

export async function fetchPoisBackend(params: {
  query: string;
  center: { lat: number; lon: number };
  radiusM: number;
  sortMode?: "relevance" | "distance";
}): Promise<Poi[]> {
  const { query, center, radiusM, sortMode } = params;

  const API_BASE = process.env.EXPO_PUBLIC_API_BASE;

  if (!API_BASE) {
    throw new Error(
      "Missing EXPO_PUBLIC_API_BASE (e.g. http://<ip>:8000)",
    );
  }

  const url = new URL(`${API_BASE}/api/pointofinterest`);
  url.searchParams.set("input", query);
  url.searchParams.set("lat", String(center.lat));
  url.searchParams.set("lng", String(center.lon));
  url.searchParams.set("max_distance", String(radiusM));
  url.searchParams.set(
    "rank_preference",
    sortMode === "relevance" ? "RELEVANCE" : "DISTANCE",
  );

  const res = await fetch(url.toString());

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`POI backend failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  const data = (json?.data ?? []) as any[];

  return data.map((x, idx): Poi => {
    const lat =
      x.lat ??
      x.latitude ??
      x.location?.lat ??
      x.location?.latitude ??
      0;

    const lon =
      x.lng ??
      x.lon ??
      x.longitude ??
      x.location?.lng ??
      x.location?.lon ??
      x.location?.longitude ??
      0;

    return {
      id: String(
        x.id ??
          x.place_id ??
          x.placeId ??
          `${x.name}-${lat}-${lon}-${idx}`,
      ),
      name: x.name ?? x.long_name ?? "Unknown",
      category:
        (Array.isArray(x.types) && x.types[0]) ||
        x.category ||
        "poi",
      address: x.address ?? x.formatted_address ?? x.vicinity,
      lat,
      lon,
    };
  });
}
