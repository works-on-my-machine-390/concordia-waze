import {
    isNoAccessibleRouteError,
    ROUTE_STYLE_ACCESSIBLE,
    ROUTE_STYLE_STANDARD,
  } from "../components/indoor/FloorPlanViewer";
  
  describe("isNoAccessibleRouteError", () => {
    test("returns false for null", () => {
      expect(isNoAccessibleRouteError(null)).toBe(false);
    });
  
    test("returns false for undefined", () => {
      expect(isNoAccessibleRouteError(undefined)).toBe(false);
    });
  
    test("returns true for Error with 'no transition point' message", () => {
      expect(isNoAccessibleRouteError(new Error("no transition point found"))).toBe(true);
    });
  
    test("is case-insensitive", () => {
      expect(isNoAccessibleRouteError(new Error("No Transition Point"))).toBe(true);
    });
  
    test("returns false for unrelated Error", () => {
      expect(isNoAccessibleRouteError(new Error("network error"))).toBe(false);
    });
  
    test("returns true for string containing 'no transition point'", () => {
      expect(isNoAccessibleRouteError("no transition point available")).toBe(true);
    });
  
    test("returns false for unrelated string", () => {
      expect(isNoAccessibleRouteError("something else went wrong")).toBe(false);
    });
  
    test("returns true for object with 'no transition point' when stringified", () => {
      expect(isNoAccessibleRouteError({ message: "no transition point" })).toBe(true);
    });
  });
  
  describe("ROUTE_STYLE_STANDARD", () => {
    test("has correct stroke properties", () => {
      expect(ROUTE_STYLE_STANDARD.strokeWidth).toBe(3);
      expect(ROUTE_STYLE_STANDARD.strokeDasharray).toBeUndefined();
      expect(ROUTE_STYLE_STANDARD.strokeLinecap).toBe("round");
      expect(ROUTE_STYLE_STANDARD.strokeLinejoin).toBe("round");
    });
  });
  
  describe("ROUTE_STYLE_ACCESSIBLE", () => {
    test("has correct stroke properties", () => {
      expect(ROUTE_STYLE_ACCESSIBLE.strokeWidth).toBe(5);
      expect(ROUTE_STYLE_ACCESSIBLE.strokeDasharray).toBe("12 6");
      expect(ROUTE_STYLE_ACCESSIBLE.strokeLinecap).toBe("round");
      expect(ROUTE_STYLE_ACCESSIBLE.strokeLinejoin).toBe("round");
    });
  
    test("is visually distinct from standard", () => {
      expect(ROUTE_STYLE_ACCESSIBLE.stroke).not.toBe(ROUTE_STYLE_STANDARD.stroke);
      expect(ROUTE_STYLE_ACCESSIBLE.strokeWidth).toBeGreaterThan(ROUTE_STYLE_STANDARD.strokeWidth);
      expect(ROUTE_STYLE_ACCESSIBLE.strokeDasharray).not.toBe(ROUTE_STYLE_STANDARD.strokeDasharray);
    });
  });