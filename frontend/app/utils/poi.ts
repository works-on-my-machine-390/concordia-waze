import { API_URL } from "@/hooks/api";

export type Poi = {
  id: string;
  name: string;
  category: string;
  lat: number;
  lon: number;
  address?: string;
};

type SortMode = "relevance" | "distance";

export async function fetchPoisBackend(params: {
  query: string;
  center: { lat: number; lon: number };
  radiusM: number;
  sortMode?: SortMode;
}): Promise<Poi[]> {
  const { query, center, radiusM, sortMode } = params;

  const url = new URL(`${API_URL}/pointofinterest`);
  const sp = url.searchParams;
  sp.set("input", query);
  sp.set("lat", String(center.lat));
  sp.set("lng", String(center.lon));
  sp.set("max_distance", String(radiusM));
  sp.set("rank_preference", sortMode === "distance" ? "DISTANCE" : "RELEVANCE");

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`POI backend failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  const data: any[] = json?.data ?? [];

  const out: Poi[] = new Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const x = data[i];

    const loc = x.location;
    const lat = x.lat ?? x.latitude ?? loc?.lat ?? loc?.latitude ?? 0;
    const lon =
      x.lng ?? x.lon ?? x.longitude ?? loc?.lng ?? loc?.lon ?? loc?.longitude ?? 0;

    out[i] = {
      id: String(x.id ?? x.place_id ?? x.placeId ?? i),
      name: x.name ?? "Unknown",
      category: (Array.isArray(x.types) && x.types[0]) || x.category || "poi",
      address: x.address ?? x.formatted_address ?? x.vicinity,
      lat,
      lon,
    };
  }

  return out;
}