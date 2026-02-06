export type LatLng = { latitude: number; longitude: number };


export function lngLatToLatLng(pair: [number, number]): LatLng {
  const [lng, lat] = pair;
  return { latitude: lat, longitude: lng };
}


export function polygonToMapCoords(coordinates: number[][][]): LatLng[] {
  const outerRing = coordinates?.[0] ?? [];
  return outerRing.map((p) => lngLatToLatLng([p[0], p[1]]));
}
