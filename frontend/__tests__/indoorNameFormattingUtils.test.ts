import { formatIndoorPoiName, extractFloorFromAddress } from "../app/utils/indoorNameFormattingUtils";

describe("formatIndoorPoiName", () => {
  describe("Room formatting", () => {
    test("formats numeric room with building code", () => {
      expect(formatIndoorPoiName("210", "room", "MB")).toBe("MB210");
      expect(formatIndoorPoiName("892", "room", "H")).toBe("H892");
      expect(formatIndoorPoiName("101", "room", "CC")).toBe("CC101");
    });

    test("formats decimal room numbers", () => {
      expect(formatIndoorPoiName("2.285", "room", "MB")).toBe("MB2.285");
      expect(formatIndoorPoiName("10.5", "room", "H")).toBe("H10.5");
    });

    test("formats S-prefix rooms with space separator", () => {
      expect(formatIndoorPoiName("S2.285", "room", "MB")).toBe("MB S2.285");
      expect(formatIndoorPoiName("s1.100", "room", "H")).toBe("H s1.100");
      expect(formatIndoorPoiName("S10", "room", "CC")).toBe("CC S10");
    });

    test("strips 'Room' prefix from room names", () => {
      expect(formatIndoorPoiName("Room 210", "room", "MB")).toBe("MB210");
      expect(formatIndoorPoiName("Room210", "room", "H")).toBe("H210");
      expect(formatIndoorPoiName("room 892", "room", "CC")).toBe("CC892");
    });

    test("returns non-numeric room names as-is", () => {
      expect(formatIndoorPoiName("Conference Room A", "room", "MB")).toBe("Conference Room A");
      expect(formatIndoorPoiName("Library", "room", "H")).toBe("Library");
      expect(formatIndoorPoiName("Main Office", "room", "CC")).toBe("Main Office");
    });

    test("handles case-insensitive room type", () => {
      expect(formatIndoorPoiName("210", "ROOM", "MB")).toBe("MB210");
      expect(formatIndoorPoiName("210", "Room", "MB")).toBe("MB210");
      expect(formatIndoorPoiName("210", "RoOm", "MB")).toBe("MB210");
    });
  });

  describe("POI formatting", () => {
    test("formats poi_X pattern with capitalized type", () => {
      expect(formatIndoorPoiName("poi_1", "bathroom", "MB")).toBe("Bathroom");
      expect(formatIndoorPoiName("poi_5", "stairs", "H")).toBe("Stairs");
      expect(formatIndoorPoiName("poi_10", "elevator", "CC")).toBe("Elevator");
    });

    test("handles multi-word POI types", () => {
      expect(formatIndoorPoiName("poi_1", "water_fountain", "MB")).toBe("Water Fountain");
      expect(formatIndoorPoiName("poi_2", "fire_exit", "H")).toBe("Fire Exit");
      expect(formatIndoorPoiName("poi_3", "emergency_exit", "CC")).toBe("Emergency Exit");
    });

    test("handles case-insensitive poi_X pattern", () => {
      expect(formatIndoorPoiName("POI_1", "bathroom", "MB")).toBe("Bathroom");
      expect(formatIndoorPoiName("Poi_2", "stairs", "H")).toBe("Stairs");
    });

    test("returns non-poi_X POI names as-is", () => {
      expect(formatIndoorPoiName("Main Bathroom", "bathroom", "MB")).toBe("Main Bathroom");
      expect(formatIndoorPoiName("East Stairwell", "stairs", "H")).toBe("East Stairwell");
      expect(formatIndoorPoiName("bathroom_a", "bathroom", "CC")).toBe("bathroom_a");
    });
  });

  describe("Edge cases", () => {
    test("handles empty strings", () => {
      expect(formatIndoorPoiName("", "room", "MB")).toBe("");
      expect(formatIndoorPoiName("210", "", "MB")).toBe("210");
      expect(formatIndoorPoiName("210", "room", "")).toBe("210");
    });

    test("handles whitespace in room names", () => {
      expect(formatIndoorPoiName("  210  ", "room", "MB")).toBe("MB210");
      expect(formatIndoorPoiName(" Room 210 ", "room", "H")).toBe(" Room 210 ");
    });

    test("handles single digit room numbers", () => {
      expect(formatIndoorPoiName("1", "room", "MB")).toBe("MB1");
      expect(formatIndoorPoiName("9", "room", "H")).toBe("H9");
    });

    test("handles long room numbers", () => {
      expect(formatIndoorPoiName("10123", "room", "MB")).toBe("MB10123");
      expect(formatIndoorPoiName("9999", "room", "H")).toBe("H9999");
    });

    test("handles different building codes", () => {
      expect(formatIndoorPoiName("210", "room", "A")).toBe("A210");
      expect(formatIndoorPoiName("210", "room", "XYZ")).toBe("XYZ210");
      expect(formatIndoorPoiName("210", "room", "123")).toBe("123210");
    });
  });

  describe("Special patterns", () => {
    test("does not format S-prefix if not followed by digit", () => {
      expect(formatIndoorPoiName("SA", "room", "MB")).toBe("SA");
      expect(formatIndoorPoiName("SPACE", "room", "H")).toBe("SPACE");
    });

    test("handles complex room patterns", () => {
      expect(formatIndoorPoiName("S2.285A", "room", "MB")).toBe("S2.285A");
      expect(formatIndoorPoiName("210A", "room", "H")).toBe("210A");
    });

    test("preserves decimal precision", () => {
      expect(formatIndoorPoiName("2.2850", "room", "MB")).toBe("MB2.2850");
      expect(formatIndoorPoiName("1.001", "room", "H")).toBe("H1.001");
    });

    test("handles Room prefix with numbers", () => {
      expect(formatIndoorPoiName("Room 210", "room", "MB")).toBe("MB210");
      expect(formatIndoorPoiName("Room210", "room", "H")).toBe("H210");
      expect(formatIndoorPoiName("room 892", "room", "CC")).toBe("CC892");
    });
  });
});

describe("extractFloorFromAddress", () => {
  test("extracts positive floor numbers", () => {
    expect(extractFloorFromAddress("MB - Floor 1")).toBe(1);
    expect(extractFloorFromAddress("H - Floor 8")).toBe(8);
    expect(extractFloorFromAddress("CC - Floor 15")).toBe(15);
  });

  test("extracts negative floor numbers (basement)", () => {
    expect(extractFloorFromAddress("MB - Floor -1")).toBe(-1);
    expect(extractFloorFromAddress("H - Floor -2")).toBe(-2);
  });

  test("handles case-insensitive floor keyword", () => {
    expect(extractFloorFromAddress("MB - floor 3")).toBe(3);
    expect(extractFloorFromAddress("H - FLOOR 5")).toBe(5);
    expect(extractFloorFromAddress("CC - FlOoR 2")).toBe(2);
  });

  test("handles varying whitespace", () => {
    expect(extractFloorFromAddress("MB - Floor  2")).toBe(2);
    expect(extractFloorFromAddress("H - Floor   10")).toBe(10);
    expect(extractFloorFromAddress("Floor 3")).toBe(3);
  });

  test("returns 1 when no floor found", () => {
    expect(extractFloorFromAddress("MB - Building")).toBe(1);
    expect(extractFloorFromAddress("No floor here")).toBe(1);
    expect(extractFloorFromAddress("")).toBe(1);
    expect(extractFloorFromAddress("Random text")).toBe(1);
  });

  test("extracts first floor occurrence if multiple", () => {
    expect(extractFloorFromAddress("Floor 2 - Floor 3")).toBe(2);
    expect(extractFloorFromAddress("Building Floor 5 on Floor 1")).toBe(5);
  });

  test("handles floor number at different positions", () => {
    expect(extractFloorFromAddress("Floor 4 - MB")).toBe(4);
    expect(extractFloorFromAddress("Building MB, Floor 7")).toBe(7);
    expect(extractFloorFromAddress("H Building - Floor 2 - Room 210")).toBe(2);
  });

  test("handles zero floor", () => {
    expect(extractFloorFromAddress("MB - Floor 0")).toBe(0);
  });

  test("extracts large floor numbers", () => {
    expect(extractFloorFromAddress("Floor 99")).toBe(99);
    expect(extractFloorFromAddress("Floor 123")).toBe(123);
  });

  test("handles addresses with dashes and special characters", () => {
    expect(extractFloorFromAddress("MB-210 - Floor 3")).toBe(3);
    expect(extractFloorFromAddress("H/892 - Floor 8")).toBe(8);
  });
});