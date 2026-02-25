
/**
 * Simplifies the address down to the civic number and street name.
 * @param address the original address as returned by Google Maps/the POI endpoint
 * @returns the simplified address
 */
export function getSimplifiedAddress(address: string) {
    const parts = address.split(',');
    return parts.slice(0, -3).join(',').trim();
}