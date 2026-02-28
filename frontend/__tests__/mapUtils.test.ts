import * as Location from "expo-location";
import {
  getAddressFromLocation,
  getDistance,
  getDistanceInMeters,
  getIsCrossCampus,
} from "../app/utils/mapUtils";

jest.mock("expo-location", () => ({
  reverseGeocodeAsync: jest.fn(),
}));

describe("mapUtils", () => {
  const mockedReverseGeocodeAsync = Location.reverseGeocodeAsync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  describe("getIsCrossCampus", () => {
    it("should return true when locations are on different campuses", () => {
      const start = { latitude: 45.4972, longitude: -73.5791 }; // SGW
      const end = { latitude: 45.4589, longitude: -73.64 }; // LOY

      expect(getIsCrossCampus(start, end)).toBe(true);
    });

    it("should return false when locations are on the same campus", () => {
      const start = { latitude: 45.4972, longitude: -73.5791 }; // SGW
      const end = { latitude: 45.498, longitude: -73.5785 }; // SGW nearby

      expect(getIsCrossCampus(start, end)).toBe(false);
    });

    it("should return false when one location is missing", () => {
      const end = { latitude: 45.4589, longitude: -73.64 };

      expect(getIsCrossCampus(undefined as any, end)).toBe(false);
      expect(getIsCrossCampus(end, undefined as any)).toBe(false);
    });
  });

  describe("getAddressFromLocation", () => {
    it("should return formatted address when reverse geocode succeeds", async () => {
      mockedReverseGeocodeAsync.mockResolvedValue([
        {
          streetNumber: "1455",
          street: "De Maisonneuve Blvd W",
          city: "Montreal",
          region: "QC",
          postalCode: "H3G 1M8",
        },
      ]);

      const location = {
        coords: { latitude: 45.4972, longitude: -73.5791 },
      } as any;

      await expect(getAddressFromLocation(location)).resolves.toBe(
        "1455 De Maisonneuve Blvd W, Montreal, QC, H3G 1M8",
      );
      expect(mockedReverseGeocodeAsync).toHaveBeenCalledWith({
        latitude: 45.4972,
        longitude: -73.5791,
      });
    });

    it("should return Current Location when reverse geocode throws", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      mockedReverseGeocodeAsync.mockRejectedValue(new Error("geocode failed"));

      const location = {
        coords: { latitude: 45.4972, longitude: -73.5791 },
      } as any;

      await expect(getAddressFromLocation(location)).resolves.toBe(
        "Current Location",
      );
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should return empty string when coords are missing", async () => {
      await expect(getAddressFromLocation(undefined as any)).resolves.toBe("");
      await expect(getAddressFromLocation({} as any)).resolves.toBe("");
      expect(mockedReverseGeocodeAsync).not.toHaveBeenCalled();
    });
  });
});
