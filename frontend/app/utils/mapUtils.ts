// Haversine formula
export function getDistance(
  point1: { latitude: number; longitude: number },
  point2: { latitude: number; longitude: number },
) {
  const R = 6371; // Earth's radius in kilometers
  const lat1 = (point1.latitude * Math.PI) / 180;
  const lat2 = (point2.latitude * Math.PI) / 180;
  const deltaLat = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const deltaLon = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getDistanceInMeters(
  point1: { latitude: number; longitude: number },
  point2: { latitude: number; longitude: number },
) {
  return getDistance(point1, point2) * 1000;
}
