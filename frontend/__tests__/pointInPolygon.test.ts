import { isPointInPolygon } from "../app/utils/pointInPolygon";

describe("isPointInPolygon", () => {
  test("returns true when point is inside polygon", () => {
    const square = [
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 10 },
      { latitude: 10, longitude: 10 },
      { latitude: 10, longitude: 0 },
    ];

    const point = { latitude: 5, longitude: 5 };
    expect(isPointInPolygon(point, square)).toBe(true);
  });

  test("returns false when point is outside polygon", () => {
    const square = [
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 10 },
      { latitude: 10, longitude: 10 },
      { latitude: 10, longitude: 0 },
    ];

    const point = { latitude: 20, longitude: 20 };
    expect(isPointInPolygon(point, square)).toBe(false);
  });

  test("returns false for invalid polygon", () => {
    const point = { latitude: 5, longitude: 5 };
    expect(isPointInPolygon(point, [])).toBe(false);
    expect(
      isPointInPolygon(point, [{ latitude: 0, longitude: 0 } as any]),
    ).toBe(false);
  });
});
