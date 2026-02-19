/**
 * Tests for OpeningHours component
 */

import { COLORS } from "@/app/constants";
import * as dateUtils from "@/app/utils/dateUtils";
import OpeningHours from "@/components/OpeningHours";
import { OpeningHours as OpeningHoursType } from "@/hooks/queries/buildingQueries";
import { render } from "@testing-library/react-native";

// Mock the dateUtils module
jest.mock("@/app/utils/dateUtils", () => ({
  daysOfWeek: [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ],
  OpenStatusTypes: {
    OPEN: "Open now",
    OPEN_24H: "Open 24 hours",
    CLOSED: "Closed",
    CLOSING_SOON: "Closing soon",
    OPENING_SOON: "Opening soon",
  },
  getIsOpen247: jest.fn(),
  getOpenStatus: jest.fn(),
  getOpenStatusColor: jest.fn(),
}));

describe("OpeningHours", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders null when openingHours is undefined", () => {
    const { toJSON } = render(<OpeningHours openingHours={undefined as any} />);
    expect(toJSON()).toBeNull();
  });

  test("renders null when openingHours is empty object", () => {
    const { toJSON } = render(<OpeningHours openingHours={{}} />);
    expect(toJSON()).toBeNull();
  });

  test("renders 24/7 status and hours for open 24/7 building", () => {
    const mockHours: OpeningHoursType = {
      sunday: { open: "00:00", close: "" },
    };

    (dateUtils.getIsOpen247 as jest.Mock).mockReturnValue(true);
    (dateUtils.getOpenStatus as jest.Mock).mockReturnValue("Open 24 hours");
    (dateUtils.getOpenStatusColor as jest.Mock).mockReturnValue(COLORS.success);

    const { getAllByText } = render(<OpeningHours openingHours={mockHours} />);

    expect(getAllByText("Open 24 hours")).toHaveLength(8); // 1 status + 7 days
  });

  test("renders regular opening hours with correct day formatting", () => {
    const mockHours: OpeningHoursType = {
      sunday: { open: "10:00", close: "18:00" },
      monday: { open: "08:00", close: "22:00" },
      tuesday: { open: "08:00", close: "22:00" },
      wednesday: { open: "08:00", close: "22:00" },
      thursday: { open: "08:00", close: "22:00" },
      friday: { open: "08:00", close: "20:00" },
      saturday: { open: "10:00", close: "18:00" },
    };

    (dateUtils.getIsOpen247 as jest.Mock).mockReturnValue(false);
    (dateUtils.getOpenStatus as jest.Mock).mockReturnValue("Open now");
    (dateUtils.getOpenStatusColor as jest.Mock).mockReturnValue(COLORS.success);

    const { getByText, getAllByText } = render(
      <OpeningHours openingHours={mockHours} />,
    );

    // Check status
    expect(getByText("Open now")).toBeTruthy();

    // Check day formatting (first letter capitalized)
    expect(getByText("Sunday:")).toBeTruthy();
    expect(getByText("Monday:")).toBeTruthy();
    expect(getByText("Tuesday:")).toBeTruthy();
    expect(getByText("Wednesday:")).toBeTruthy();
    expect(getByText("Thursday:")).toBeTruthy();
    expect(getByText("Friday:")).toBeTruthy();
    expect(getByText("Saturday:")).toBeTruthy();

    // Check hours formatting
    expect(getAllByText("10:00 - 18:00")).toHaveLength(2); // Sunday and Saturday
    expect(getAllByText("08:00 - 22:00")).toHaveLength(4); // Mon-Thu
    expect(getAllByText("08:00 - 20:00")).toHaveLength(1); // Friday
  });

  test("renders 'Closed' for days without hours", () => {
    const mockHours: OpeningHoursType = {
      sunday: undefined,
      monday: { open: "08:00", close: "22:00" },
      tuesday: { open: "08:00", close: "22:00" },
      wednesday: { open: "08:00", close: "22:00" },
      thursday: { open: "08:00", close: "22:00" },
      friday: { open: "08:00", close: "20:00" },
      saturday: undefined,
    };

    (dateUtils.getIsOpen247 as jest.Mock).mockReturnValue(false);
    (dateUtils.getOpenStatus as jest.Mock).mockReturnValue("Closed");
    (dateUtils.getOpenStatusColor as jest.Mock).mockReturnValue(COLORS.error);

    const { getAllByText } = render(<OpeningHours openingHours={mockHours} />);

    expect(getAllByText("Closed")).toHaveLength(3); // status + sunday + saturday
  });

  test("renders 'Open 24 hours' for specific day with 00:00 and no close time", () => {
    const mockHours: OpeningHoursType = {
      sunday: { open: "10:00", close: "18:00" },
      monday: { open: "00:00", close: "" },
      tuesday: { open: "08:00", close: "22:00" },
      wednesday: { open: "08:00", close: "22:00" },
      thursday: { open: "08:00", close: "22:00" },
      friday: { open: "08:00", close: "20:00" },
      saturday: { open: "10:00", close: "18:00" },
    };

    (dateUtils.getIsOpen247 as jest.Mock).mockReturnValue(false);
    (dateUtils.getOpenStatus as jest.Mock).mockReturnValue("Open now");
    (dateUtils.getOpenStatusColor as jest.Mock).mockReturnValue(COLORS.success);

    const { getAllByText } = render(<OpeningHours openingHours={mockHours} />);

    const open24Hours = getAllByText("Open 24 hours");
    expect(open24Hours.length).toBeGreaterThan(0);
  });

  test("renders with closing soon status and warning color", () => {
    const mockHours: OpeningHoursType = {
      sunday: { open: "10:00", close: "18:00" },
      monday: { open: "08:00", close: "22:00" },
      tuesday: { open: "08:00", close: "22:00" },
      wednesday: { open: "08:00", close: "22:00" },
      thursday: { open: "08:00", close: "22:00" },
      friday: { open: "08:00", close: "20:00" },
      saturday: { open: "10:00", close: "18:00" },
    };

    (dateUtils.getIsOpen247 as jest.Mock).mockReturnValue(false);
    (dateUtils.getOpenStatus as jest.Mock).mockReturnValue("Closing soon");
    (dateUtils.getOpenStatusColor as jest.Mock).mockReturnValue(COLORS.warning);

    const { getByText } = render(<OpeningHours openingHours={mockHours} />);

    const statusText = getByText("Closing soon");
    expect(statusText).toBeTruthy();
    expect(statusText.props.style).toContainEqual({ color: COLORS.warning });
  });

  test("renders with opening soon status", () => {
    const mockHours: OpeningHoursType = {
      sunday: { open: "10:00", close: "18:00" },
      monday: { open: "08:00", close: "22:00" },
      tuesday: { open: "08:00", close: "22:00" },
      wednesday: { open: "08:00", close: "22:00" },
      thursday: { open: "08:00", close: "22:00" },
      friday: { open: "08:00", close: "20:00" },
      saturday: { open: "10:00", close: "18:00" },
    };

    (dateUtils.getIsOpen247 as jest.Mock).mockReturnValue(false);
    (dateUtils.getOpenStatus as jest.Mock).mockReturnValue("Opening soon");
    (dateUtils.getOpenStatusColor as jest.Mock).mockReturnValue(COLORS.warning);

    const { getByText } = render(<OpeningHours openingHours={mockHours} />);

    expect(getByText("Opening soon")).toBeTruthy();
  });

  test("calls dateUtils functions with correct parameters", () => {
    const mockHours: OpeningHoursType = {
      sunday: { open: "10:00", close: "18:00" },
      monday: { open: "08:00", close: "22:00" },
      tuesday: { open: "08:00", close: "22:00" },
      wednesday: { open: "08:00", close: "22:00" },
      thursday: { open: "08:00", close: "22:00" },
      friday: { open: "08:00", close: "20:00" },
      saturday: { open: "10:00", close: "18:00" },
    };

    (dateUtils.getIsOpen247 as jest.Mock).mockReturnValue(false);
    (dateUtils.getOpenStatus as jest.Mock).mockReturnValue("Open now");
    (dateUtils.getOpenStatusColor as jest.Mock).mockReturnValue(COLORS.success);

    render(<OpeningHours openingHours={mockHours} />);

    expect(dateUtils.getIsOpen247).toHaveBeenCalledWith(mockHours);
    expect(dateUtils.getOpenStatus).toHaveBeenCalledWith(mockHours);
    expect(dateUtils.getOpenStatusColor).toHaveBeenCalledWith("Open now");
  });

  test("renders mixed hours (some days open, some closed, some 24 hours)", () => {
    const mockHours: OpeningHoursType = {
      sunday: undefined,
      monday: { open: "08:00", close: "22:00" },
      tuesday: { open: "00:00", close: "" },
      wednesday: { open: "08:00", close: "22:00" },
      thursday: { open: "08:00", close: "22:00" },
      friday: { open: "08:00", close: "20:00" },
      saturday: undefined,
    };

    (dateUtils.getIsOpen247 as jest.Mock).mockReturnValue(false);
    (dateUtils.getOpenStatus as jest.Mock).mockReturnValue("Open now");
    (dateUtils.getOpenStatusColor as jest.Mock).mockReturnValue(COLORS.success);

    const { getAllByText } = render(<OpeningHours openingHours={mockHours} />);

    // Check for closed days
    expect(getAllByText("Closed")).toHaveLength(2); // Sunday and Saturday

    // Check for regular hours
    expect(getAllByText("08:00 - 22:00")).toHaveLength(3); // Mon, Wed, Thu

    // Check for 24 hours day
    expect(getAllByText("Open 24 hours")).toHaveLength(1); // Tuesday
  });

  test("renders all days in correct order", () => {
    const mockHours: OpeningHoursType = {
      sunday: { open: "10:00", close: "18:00" },
      monday: { open: "08:00", close: "22:00" },
      tuesday: { open: "08:00", close: "22:00" },
      wednesday: { open: "08:00", close: "22:00" },
      thursday: { open: "08:00", close: "22:00" },
      friday: { open: "08:00", close: "20:00" },
      saturday: { open: "10:00", close: "18:00" },
    };

    (dateUtils.getIsOpen247 as jest.Mock).mockReturnValue(false);
    (dateUtils.getOpenStatus as jest.Mock).mockReturnValue("Open now");
    (dateUtils.getOpenStatusColor as jest.Mock).mockReturnValue(COLORS.success);

    const { getByText } = render(<OpeningHours openingHours={mockHours} />);

    const days = [
      "Sunday:",
      "Monday:",
      "Tuesday:",
      "Wednesday:",
      "Thursday:",
      "Friday:",
      "Saturday:",
    ];

    days.forEach((day) => {
      expect(getByText(day)).toBeTruthy();
    });
  });

  test("renders with error color when closed", () => {
    const mockHours: OpeningHoursType = {
      sunday: undefined,
      monday: undefined,
      tuesday: undefined,
      wednesday: undefined,
      thursday: undefined,
      friday: undefined,
      saturday: undefined,
    };

    (dateUtils.getIsOpen247 as jest.Mock).mockReturnValue(false);
    (dateUtils.getOpenStatus as jest.Mock).mockReturnValue("Closed");
    (dateUtils.getOpenStatusColor as jest.Mock).mockReturnValue(COLORS.error);

    const { getAllByText } = render(<OpeningHours openingHours={mockHours} />);

    const statusTexts = getAllByText("Closed");
    expect(statusTexts[0].props.style).toContainEqual({ color: COLORS.error });
  });

  test("renders with success color when open", () => {
    const mockHours: OpeningHoursType = {
      sunday: { open: "10:00", close: "18:00" },
      monday: { open: "08:00", close: "22:00" },
      tuesday: { open: "08:00", close: "22:00" },
      wednesday: { open: "08:00", close: "22:00" },
      thursday: { open: "08:00", close: "22:00" },
      friday: { open: "08:00", close: "20:00" },
      saturday: { open: "10:00", close: "18:00" },
    };

    (dateUtils.getIsOpen247 as jest.Mock).mockReturnValue(false);
    (dateUtils.getOpenStatus as jest.Mock).mockReturnValue("Open now");
    (dateUtils.getOpenStatusColor as jest.Mock).mockReturnValue(COLORS.success);

    const { getByText } = render(<OpeningHours openingHours={mockHours} />);

    const statusText = getByText("Open now");
    expect(statusText.props.style).toContainEqual({ color: COLORS.success });
  });
});
