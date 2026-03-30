import { render } from "@testing-library/react-native";
import NextClassCard from "../components/classes/NextClassCard";
import { NextClassResponse } from "../hooks/queries/classQueries";

jest.mock("../components/classes/DirectionsToRoomButton", () => {
  const { View } = require("react-native");
  return function MockDirectionsToRoomButton() {
    return <View testID="directions-to-room-button" />;
  };
});

const mockNextClass: NextClassResponse = {
  className: "SOEN 363",
  buildingLatitude: 0,
  buildingLongitude: 0,
  floorNumber: 0,
  roomX: 0,
  roomY: 0,
  item: {
    type: "Lecture" as const,
    section: "WW",
    day: "FRI",
    startTime: "16:00",
    endTime: "17:15",
    buildingCode: "MB",
    room: "S2.210",
    origin: "manual" as const,
  },
};

const mockDate = (hour: number, minute: number) => {
  const date = new Date(2026, 0, 1, hour, minute);
  jest.spyOn(globalThis, "Date").mockImplementation(() => date as any);
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe("NextClassCard", () => {
  test("renders course name in uppercase", () => {
    mockDate(15, 0);
    const { getByText } = render(<NextClassCard nextClass={mockNextClass} />);
    expect(getByText("SOEN 363 - LEC")).toBeTruthy();
  });

  test("renders location in correct format", () => {
    mockDate(15, 0);
    const { getByText } = render(<NextClassCard nextClass={mockNextClass} />);
    expect(getByText("MB S2.210")).toBeTruthy();
  });

  test("renders start time", () => {
    mockDate(15, 0);
    const { getByText } = render(<NextClassCard nextClass={mockNextClass} />);
    expect(getByText("16:00")).toBeTruthy();
  });

  test("shows minutes when under 60 minutes until class", () => {
    mockDate(15, 30);
    const { getByText } = render(<NextClassCard nextClass={mockNextClass} />);
    expect(getByText("NEXT CLASS IN 30 MIN.")).toBeTruthy();
  });

  test("shows hours when exactly on the hour", () => {
    mockDate(14, 0);
    const { getByText } = render(<NextClassCard nextClass={mockNextClass} />);
    expect(getByText("NEXT CLASS IN 2H")).toBeTruthy();
  });

  test("shows hours and minutes when over 60 minutes with remainder", () => {
    mockDate(14, 30);
    const { getByText } = render(<NextClassCard nextClass={mockNextClass} />);
    expect(getByText("NEXT CLASS IN 1H30")).toBeTruthy();
  });

  test("shows CLASS IN PROGRESS when class has already started", () => {
    mockDate(16, 30);
    const { getByText } = render(<NextClassCard nextClass={mockNextClass} />);
    expect(getByText("CLASS IN PROGRESS")).toBeTruthy();
  });

  test("shows NO MORE CLASSES TODAY when nextClass is null", () => {
    const { getByText } = render(<NextClassCard nextClass={null} />);
    expect(getByText("NO MORE CLASSES TODAY")).toBeTruthy();
  });

  test("shows NO MORE CLASSES TODAY when nextClass has no item", () => {
    const nextClassWithoutItem = {
      className: "SOEN 363",
      buildingLatitude: 0,
      buildingLongitude: 0,
      floorNumber: 0,
      roomX: 0,
      roomY: 0,
      item: undefined,
    } as any;

    const { getByText } = render(
      <NextClassCard nextClass={nextClassWithoutItem} />,
    );
    expect(getByText("NO MORE CLASSES TODAY")).toBeTruthy();
  });

  test("updates minutesUntil after next minute tick", () => {
    jest.useFakeTimers();
    mockDate(15, 30);

    const { getByText } = render(<NextClassCard nextClass={mockNextClass} />);

    expect(getByText("NEXT CLASS IN 30 MIN.")).toBeTruthy();

    jest.advanceTimersByTime(61000);

    expect(getByText("NEXT CLASS IN 30 MIN.")).toBeTruthy();

    jest.useRealTimers();
  });
});
