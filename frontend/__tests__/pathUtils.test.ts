import {
  createDottedPathPoints,
  dist2,
  getClosestPointIndex,
  getSafeStepIndex,
  getSegmentIndexFromStepId,
  orthogonalizePath,
  simplifyOrthogonalPath,
} from "../app/utils/pathUtils";

describe("pathUtils", () => {
  test("dist2 computes squared distance", () => {
    expect(dist2(0, 0, 3, 4)).toBe(25);
  });

  test("orthogonalizePath inserts an elbow for diagonal segments", () => {
    const result = orthogonalizePath([
      { x: 0, y: 0 },
      { x: 4, y: 3 },
    ]);

    expect(result).toEqual([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 3 },
    ]);
  });

  test("simplifyOrthogonalPath removes collinear intermediate points", () => {
    const result = simplifyOrthogonalPath([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 1 },
    ]);

    expect(result).toEqual([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 1 },
    ]);
  });

  test("createDottedPathPoints returns an empty array for a path with <= 1 point", () => {
    expect(createDottedPathPoints([])).toEqual([]);
    expect(createDottedPathPoints([{ x: 0, y: 0 }])).toEqual([]);
  });

  test("createDottedPathPoints includes path end point", () => {
    const dots = createDottedPathPoints(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      4,
    );

    expect(dots.at(-1)).toEqual({ x: 10, y: 0 });
  });

  test("getSafeStepIndex clamps requested index to valid range", () => {
    expect(getSafeStepIndex(undefined, 3)).toBe(0);
    expect(getSafeStepIndex(-5, 3)).toBe(0);
    expect(getSafeStepIndex(99, 3)).toBe(2);
    expect(getSafeStepIndex(1, 3)).toBe(1);
    expect(getSafeStepIndex(10, 0)).toBe(0);
  });

  test("getSegmentIndexFromStepId parses valid step IDs", () => {
    expect(getSegmentIndexFromStepId("turn-4-2")).toBe(4);
    expect(getSegmentIndexFromStepId("arrival-1")).toBe(1);
    expect(getSegmentIndexFromStepId("bad")).toBeUndefined();
    expect(getSegmentIndexFromStepId()).toBeUndefined();
  });

  test("getClosestPointIndex returns nearest point index", () => {
    const index = getClosestPointIndex(
      [
        { x: 0, y: 0 },
        { x: 2, y: 2 },
        { x: 10, y: 10 },
      ],
      { x: 1.9, y: 2.1 },
    );

    expect(index).toBe(1);
  });
});
