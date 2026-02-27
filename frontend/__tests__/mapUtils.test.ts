import { getDistance, getDistanceInMeters } from "../app/utils/mapUtils";

describe("mapUtils", () => {
  describe("getDistance", () => {
    it("should return 0 for the same location", () => {
      const point = { latitude: 45.4972, longitude: -73.5789 };
      const distance = getDistance(point, point);
      expect(distance).toBe(0);
    });

    it("should calculate distance between two points", () => {
      // Distance between Montreal and Quebec City
      const p1 = { latitude: 45.5017, longitude: -73.5673 };
      const p2 = { latitude: 46.8139, longitude: -71.208 };
      const distance = getDistance(p1, p2);

      // Expected distance is approximately 233 km
      expect(distance).toBeGreaterThan(230);
      expect(distance).toBeLessThan(240);
    });
  });

  describe("getDistanceInMeters", () => {
    it("should return distance in meters", () => {
      const p1 = { latitude: 45.5017, longitude: -73.5673 };
      const p2 = { latitude: 46.8139, longitude: -71.208 };
      const distanceInMeters = getDistanceInMeters(p1, p2);

      expect(distanceInMeters).toBeGreaterThan(230000);
      expect(distanceInMeters).toBeLessThan(240000);
    });
  });
});
