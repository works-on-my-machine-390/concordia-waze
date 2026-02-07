import { polygonToMapCoords } from "../app/utils/polygonMapper";

describe("polygonToMapCoords", () => {
  test("converts GeoJSON [lng, lat] into [{latitude, longitude}]", () => {
    const geoJsonCoords = [
      [
        [-73.0, 45.0],
        [-73.1, 45.1],
        [-73.2, 45.2],
      ],
    ];

    const result = polygonToMapCoords(geoJsonCoords as any);

    expect(result).toEqual([
      { latitude: 45.0, longitude: -73.0 },
      { latitude: 45.1, longitude: -73.1 },
      { latitude: 45.2, longitude: -73.2 },
    ]);
  });
});
