import { COLORS } from "@/app/constants";
import {
  daysOfWeek,
  getIsOpen247,
  getOpenStatus,
  getOpenStatusColor,
  OpenStatusTypes,
  SOON_THRESHOLD_IN_MINUTES,
  toMinutes,
} from "@/app/utils/dateUtils";
import type { OpeningHoursModel } from "@/hooks/queries/buildingQueries";

describe("dateUtils", () => {
  describe("constants", () => {
    it("should have correct days of week in order", () => {
      expect(daysOfWeek).toEqual([
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ]);
    });

    it("should have correct open status types", () => {
      expect(OpenStatusTypes.OPEN).toBe("Open now");
      expect(OpenStatusTypes.OPEN_24H).toBe("Open 24 hours");
      expect(OpenStatusTypes.CLOSED).toBe("Closed");
      expect(OpenStatusTypes.CLOSING_SOON).toBe("Closing soon");
      expect(OpenStatusTypes.OPENING_SOON).toBe("Opening soon");
    });

    it("should have correct soon threshold", () => {
      expect(SOON_THRESHOLD_IN_MINUTES).toBe(60);
    });
  });

  describe("getIsOpen247", () => {
    it("should return true when building is open 24/7", () => {
      const openingHours: OpeningHoursModel = {
        sunday: { open: "00:00", close: "" },
        monday: { open: "00:00", close: "" },
        tuesday: { open: "00:00", close: "" },
        wednesday: { open: "00:00", close: "" },
        thursday: { open: "00:00", close: "" },
        friday: { open: "00:00", close: "" },
        saturday: { open: "00:00", close: "" },
      };

      expect(getIsOpen247(openingHours)).toBe(true);
    });

    it("should return undefined when building has regular hours", () => {
      const openingHours: OpeningHoursModel = {
        sunday: { open: "09:00", close: "17:00" },
        monday: { open: "09:00", close: "17:00" },
        tuesday: { open: "09:00", close: "17:00" },
        wednesday: { open: "09:00", close: "17:00" },
        thursday: { open: "09:00", close: "17:00" },
        friday: { open: "09:00", close: "17:00" },
        saturday: { open: "09:00", close: "17:00" },
      };

      expect(getIsOpen247(openingHours)).toBeUndefined();
    });

    it("should return undefined when only sunday check fails", () => {
      const openingHours: OpeningHoursModel = {
        sunday: { open: "09:00", close: "17:00" },
        monday: { open: "00:00", close: "" },
        tuesday: { open: "00:00", close: "" },
        wednesday: { open: "00:00", close: "" },
        thursday: { open: "00:00", close: "" },
        friday: { open: "00:00", close: "" },
        saturday: { open: "00:00", close: "" },
      };

      expect(getIsOpen247(openingHours)).toBeUndefined();
    });

    it("should return true when sunday has 00:00 open and no close time", () => {
      const openingHours: OpeningHoursModel = {
        sunday: { open: "00:00", close: "" },
      };

      expect(getIsOpen247(openingHours)).toBe(true);
    });
  });

  describe("getOpenStatus", () => {
    const mockDate = (day: number, hour: number, minute: number) => {
      const date = new Date(2026, 0, 4 + day, hour, minute); // Jan 4, 2026 is a Sunday
      jest.spyOn(globalThis, "Date").mockImplementation(() => date as any);
      return date;
    };

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should return OPEN_24H when building is open 24/7", () => {
      const openingHours: OpeningHoursModel = {
        sunday: { open: "00:00", close: "" },
      };
      mockDate(0, 10, 0); // Sunday 10:00

      expect(getOpenStatus(openingHours)).toBe(OpenStatusTypes.OPEN_24H);
    });

    it("should return OPEN_24H when building is open 24 hours on current day", () => {
      const openingHours: OpeningHoursModel = {
        monday: { open: "00:00", close: "" },
      };
      mockDate(1, 10, 0); // Monday 10:00

      expect(getOpenStatus(openingHours)).toBe(OpenStatusTypes.OPEN_24H);
    });

    it("should return CLOSED when no hours are defined for current day", () => {
      const openingHours: OpeningHoursModel = {};
      mockDate(0, 10, 0); // Sunday 10:00

      expect(getOpenStatus(openingHours)).toBe(OpenStatusTypes.CLOSED);
    });

    it("should return OPEN when within opening hours", () => {
      const openingHours: OpeningHoursModel = {
        monday: { open: "09:00", close: "17:00" },
      };
      mockDate(1, 12, 0); // Monday 12:00

      expect(getOpenStatus(openingHours)).toBe(OpenStatusTypes.OPEN);
    });

    it("should return CLOSING_SOON when less than 60 minutes until closing", () => {
      const openingHours: OpeningHoursModel = {
        monday: { open: "09:00", close: "17:00" },
      };
      mockDate(1, 16, 30); // Monday 16:30 (30 minutes before closing)

      expect(getOpenStatus(openingHours)).toBe(OpenStatusTypes.CLOSING_SOON);
    });

    it("should return CLOSING_SOON when exactly 60 minutes until closing", () => {
      const openingHours: OpeningHoursModel = {
        monday: { open: "09:00", close: "17:00" },
      };
      mockDate(1, 16, 0); // Monday 16:00 (60 minutes before closing)

      expect(getOpenStatus(openingHours)).toBe(OpenStatusTypes.CLOSING_SOON);
    });

    it("should return OPEN when more than 60 minutes until closing", () => {
      const openingHours: OpeningHoursModel = {
        monday: { open: "09:00", close: "17:00" },
      };
      mockDate(1, 15, 59); // Monday 15:59 (61 minutes before closing)

      expect(getOpenStatus(openingHours)).toBe(OpenStatusTypes.OPEN);
    });

    it("should return OPENING_SOON when less than 60 minutes before opening", () => {
      const openingHours: OpeningHoursModel = {
        monday: { open: "09:00", close: "17:00" },
      };
      mockDate(1, 8, 30); // Monday 08:30 (30 minutes before opening)

      expect(getOpenStatus(openingHours)).toBe(OpenStatusTypes.OPENING_SOON);
    });

    it("should return OPENING_SOON when exactly 60 minutes before opening", () => {
      const openingHours: OpeningHoursModel = {
        monday: { open: "09:00", close: "17:00" },
      };
      mockDate(1, 8, 0); // Monday 08:00 (60 minutes before opening)

      expect(getOpenStatus(openingHours)).toBe(OpenStatusTypes.OPENING_SOON);
    });

    it("should return CLOSED when more than 60 minutes before opening", () => {
      const openingHours: OpeningHoursModel = {
        monday: { open: "09:00", close: "17:00" },
      };
      mockDate(1, 7, 59); // Monday 07:59 (61 minutes before opening)

      expect(getOpenStatus(openingHours)).toBe(OpenStatusTypes.CLOSED);
    });

    it("should return CLOSED when after closing time", () => {
      const openingHours: OpeningHoursModel = {
        monday: { open: "09:00", close: "17:00" },
      };
      mockDate(1, 18, 0); // Monday 18:00

      expect(getOpenStatus(openingHours)).toBe(OpenStatusTypes.CLOSED);
    });

    it("should return OPEN at exact opening time", () => {
      const openingHours: OpeningHoursModel = {
        monday: { open: "09:00", close: "17:00" },
      };
      mockDate(1, 9, 0); // Monday 09:00

      expect(getOpenStatus(openingHours)).toBe(OpenStatusTypes.OPEN);
    });

    it("should return CLOSED at exact closing time", () => {
      const openingHours: OpeningHoursModel = {
        monday: { open: "09:00", close: "17:00" },
      };
      mockDate(1, 17, 0); // Monday 17:00

      expect(getOpenStatus(openingHours)).toBe(OpenStatusTypes.CLOSED);
    });

    it("should handle different days of the week correctly", () => {
      const openingHours: OpeningHoursModel = {
        tuesday: { open: "08:00", close: "18:00" },
      };
      mockDate(2, 12, 0); // Tuesday 12:00

      expect(getOpenStatus(openingHours)).toBe(OpenStatusTypes.OPEN);
    });

    it("should handle late night hours correctly", () => {
      const openingHours: OpeningHoursModel = {
        friday: { open: "20:00", close: "23:59" },
      };
      mockDate(5, 22, 0); // Friday 22:00

      expect(getOpenStatus(openingHours)).toBe(OpenStatusTypes.OPEN);
    });

    it("should handle early morning hours correctly", () => {
      const openingHours: OpeningHoursModel = {
        saturday: { open: "00:00", close: "03:00" },
      };
      mockDate(6, 1, 0); // Saturday 01:00

      expect(getOpenStatus(openingHours)).toBe(OpenStatusTypes.OPEN);
    });
  });

  describe("getOpenStatusColor", () => {
    it("should return success color for OPEN status", () => {
      expect(getOpenStatusColor(OpenStatusTypes.OPEN)).toBe(COLORS.success);
    });

    it("should return success color for OPEN_24H status", () => {
      expect(getOpenStatusColor(OpenStatusTypes.OPEN_24H)).toBe(COLORS.success);
    });

    it("should return error color for CLOSED status", () => {
      expect(getOpenStatusColor(OpenStatusTypes.CLOSED)).toBe(COLORS.error);
    });

    it("should return warning color for CLOSING_SOON status", () => {
      expect(getOpenStatusColor(OpenStatusTypes.CLOSING_SOON)).toBe(
        COLORS.warning,
      );
    });

    it("should return warning color for OPENING_SOON status", () => {
      expect(getOpenStatusColor(OpenStatusTypes.OPENING_SOON)).toBe(
        COLORS.warning,
      );
    });
  });
  describe("toMinutes", () => {
  it("should convert HH:MM to minutes since midnight", () => {
    expect(toMinutes("00:00")).toBe(0);
    expect(toMinutes("01:00")).toBe(60);
    expect(toMinutes("16:00")).toBe(960);
    expect(toMinutes("17:15")).toBe(1035);
    expect(toMinutes("23:59")).toBe(1439);
  });
});
});