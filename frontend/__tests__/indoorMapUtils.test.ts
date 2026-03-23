import {
  floorsWithMapsByBuildingCode,
  isFloorPlanAvailable,
} from "../app/utils/indoorMapUtils";

describe("indoorMapUtils", () => {
  test("returns true for buildings that have indoor maps", () => {
    expect(isFloorPlanAvailable("MB")).toBe(true);
    expect(isFloorPlanAvailable("H")).toBe(true);
  });

  test("returns false for unknown buildings", () => {
    expect(isFloorPlanAvailable("XYZ")).toBe(false);
  });

  test("returns floor-level availability for known buildings", () => {
    expect(isFloorPlanAvailable("MB", -2)).toBe(true);
    expect(isFloorPlanAvailable("MB", 8)).toBe(false);
    expect(isFloorPlanAvailable("H", 9)).toBe(true);
  });

  test("keeps floor map list in sync with building-level availability", () => {
    Object.keys(floorsWithMapsByBuildingCode).forEach((buildingCode) => {
      expect(isFloorPlanAvailable(buildingCode)).toBe(true);
    });
  });
});
