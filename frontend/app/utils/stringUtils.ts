/**
 * Simplifies the address down to the civic number and street name.
 * @param address the original address as returned by Google Maps/the POI endpoint
 * @returns the simplified address
 */
export function getSimplifiedAddress(address: string) {
  const parts = address.split(",");
  return parts.slice(0, -3).join(",").trim();
}

/**
 * Takes a distance value in meters and simply formats it as a string, in meters if less than 1000m, and in kilometers otherwise
 * @param distanceInMeters
 * @returns the distance formatted as a string, in meters if less than 1000m, and in kilometers otherwise
 */
export function getDistanceDisplayText(distanceInMeters: number): string {
  if (distanceInMeters < 1000) {
    return `${distanceInMeters.toFixed(0)} m`;
  } else {
    return `${(distanceInMeters / 1000).toFixed(1)} km`;
  }
}

export const stripHtmlTags = (text: string) => {
  return text
    .replace(/<div[^>]*>/gi, "\n")
    .replace(/<\/div>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
};
