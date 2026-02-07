import { Point } from "@/hooks/queries/buildingQueries";

export type LatLng = { latitude: number; longitude: number };

export function lngLatToLatLng(pair: [number, number]): LatLng {
  const [lng, lat] = pair;
  return { latitude: lat, longitude: lng };
}

export function polygonToMapCoords(polygon: Point[]): LatLng[] {
  const outerRing = polygon ?? [];
  return outerRing.map((p) => lngLatToLatLng([p.longitude, p.latitude]));
}
