import { Pressable } from "react-native";
import { ActivityIndicator } from "react-native";
import React from "react";
import { fireEvent, waitFor, act, cleanup } from "@testing-library/react-native";
import { renderWithProviders } from "../test_utils/renderUtils";
import ShuttleSchedule from "../app/(drawer)/shuttle";

const mockDispatch = jest.fn();
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useNavigation: () => ({ dispatch: mockDispatch }),
  DrawerActions: { openDrawer: () => "OPEN_DRAWER" },
}));

const mockUseGetShuttleSchedule = jest.fn();
jest.mock("@/hooks/queries/shuttleQueries", () => ({
  useGetShuttleSchedule: () => mockUseGetShuttleSchedule(),
}));

type DaySchedule = { LOY: string[]; SGW: string[] };
type PartialSchedule = Partial<Record<string, DaySchedule>>;

const SCHEDULE: PartialSchedule = {
  monday:    { LOY: ["07:00", "08:00", "09:00"], SGW: ["07:30", "08:30", "09:30"] },
  tuesday:   { LOY: ["07:10", "08:10"],           SGW: ["07:40", "08:40"] },
  wednesday: { LOY: ["07:20"],                    SGW: ["07:50"] },
  thursday:  { LOY: ["07:30", "08:30"],           SGW: ["08:00", "09:00"] },
  friday:    { LOY: ["07:40"],                    SGW: ["08:10"] },
};

const mockLoaded  = (data: PartialSchedule = SCHEDULE) => mockUseGetShuttleSchedule.mockReturnValue({ data, isLoading: false, error: null,             refetch: jest.fn() });
const mockLoading = ()                                  => mockUseGetShuttleSchedule.mockReturnValue({ data: undefined, isLoading: true,  error: null,             refetch: jest.fn() });
const mockError   = (msg = "HTTP 500")                  => mockUseGetShuttleSchedule.mockReturnValue({ data: undefined, isLoading: false, error: new Error(msg), refetch: jest.fn() });

// ── Tests

describe("ShuttleSchedule screen", () => {
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => cleanup());

  // Loading / error states
  test("shows loading indicator", () => {
    mockLoading();
    expect(renderWithProviders(<ShuttleSchedule />).UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  test("shows error message with error text", () => {
    mockError("HTTP 500");
    expect(renderWithProviders(<ShuttleSchedule />).getByText(/Could not load schedule — HTTP 500/)).toBeTruthy();
  });

  test("shows Try Again button on error", () => {
    mockError();
    expect(renderWithProviders(<ShuttleSchedule />).getByText("Try Again")).toBeTruthy();
  });

  test("calls refetch when Try Again is pressed", async () => {
    const refetch = jest.fn();
    mockUseGetShuttleSchedule.mockReturnValue({ data: undefined, isLoading: false, error: new Error("fail"), refetch });
    const { getByText } = renderWithProviders(<ShuttleSchedule />);
    await act(async () => { fireEvent.press(getByText("Try Again")); });
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  test("renders title", () => {
    mockLoaded();
    expect(renderWithProviders(<ShuttleSchedule />).getByText("Shuttle Bus")).toBeTruthy();
  });

  test("renders all 5 day tab labels", () => {
    mockLoaded();
    const { getByText } = renderWithProviders(<ShuttleSchedule />);
    ["Mon", "Tue", "Wed", "Thu", "Fri"].forEach(d => expect(getByText(d)).toBeTruthy());
  });

  test("renders table column headers", () => {
    mockLoaded();
    const { getByText } = renderWithProviders(<ShuttleSchedule />);
    expect(getByText("#")).toBeTruthy();
    expect(getByText("Loyola to SGW")).toBeTruthy();
    expect(getByText("SGW to Loyola")).toBeTruthy();
  });

  test("renders ID Required card", () => {
    mockLoaded();
    const { getByText } = renderWithProviders(<ShuttleSchedule />);
    expect(getByText("ID Required")).toBeTruthy();
    expect(getByText("Show your Concordia student or staff card.")).toBeTruthy();
  });

  test("renders Questions card with contact info", () => {
    mockLoaded();
    const { getByText } = renderWithProviders(<ShuttleSchedule />);
    expect(getByText("Questions?")).toBeTruthy();
    expect(getByText(/shuttle@concordia\.ca/)).toBeTruthy();
    expect(getByText(/514-848-2424/)).toBeTruthy();
  });

  test("defaults to Monday tab and shows day label", () => {
    mockLoaded();
    expect(renderWithProviders(<ShuttleSchedule />).getByText("Monday")).toBeTruthy();
  });

  test("shows correct departure count for Monday", () => {
    mockLoaded();
    expect(renderWithProviders(<ShuttleSchedule />).getByText("3 departures")).toBeTruthy();
  });

  test("renders Monday LOY times", () => {
    mockLoaded();
    const { getByText } = renderWithProviders(<ShuttleSchedule />);
    expect(getByText("07:00")).toBeTruthy();
    expect(getByText("08:00")).toBeTruthy();
    expect(getByText("09:00")).toBeTruthy();
  });

  test("renders Monday SGW times", () => {
    mockLoaded();
    const { getByText } = renderWithProviders(<ShuttleSchedule />);
    expect(getByText("07:30")).toBeTruthy();
    expect(getByText("08:30")).toBeTruthy();
    expect(getByText("09:30")).toBeTruthy();
  });

  test("renders row numbers", () => {
    mockLoaded();
    const { getByText } = renderWithProviders(<ShuttleSchedule />);
    expect(getByText("1")).toBeTruthy();
    expect(getByText("2")).toBeTruthy();
    expect(getByText("3")).toBeTruthy();
  });

  // Tab switching
  test("switching to Tuesday shows Tuesday label and times", async () => {
    mockLoaded();
    const { getByText } = renderWithProviders(<ShuttleSchedule />);
    await act(async () => { fireEvent.press(getByText("Tue")); });
    await waitFor(() => {
      expect(getByText("Tuesday")).toBeTruthy();
      expect(getByText("07:10")).toBeTruthy();
      expect(getByText("07:40")).toBeTruthy();
    });
  });

  test("switching to Wednesday shows correct departure count", async () => {
    mockLoaded();
    const { getByText } = renderWithProviders(<ShuttleSchedule />);
    await act(async () => { fireEvent.press(getByText("Wed")); });
    await waitFor(() => expect(getByText("1 departures")).toBeTruthy());
  });

  test("switching to Thursday shows Thursday label", async () => {
    mockLoaded();
    const { getByText } = renderWithProviders(<ShuttleSchedule />);
    await act(async () => { fireEvent.press(getByText("Thu")); });
    await waitFor(() => expect(getByText("Thursday")).toBeTruthy());
  });

  test("switching to Friday shows Friday label and times", async () => {
    mockLoaded();
    const { getByText } = renderWithProviders(<ShuttleSchedule />);
    await act(async () => { fireEvent.press(getByText("Fri")); });
    await waitFor(() => {
      expect(getByText("Friday")).toBeTruthy();
      expect(getByText("07:40")).toBeTruthy();
    });
  });

  test("switching tabs hides previous day's times", async () => {
    mockLoaded();
    const { getByText, queryByText } = renderWithProviders(<ShuttleSchedule />);
    await act(async () => { fireEvent.press(getByText("Tue")); });
    await waitFor(() => expect(queryByText("09:00")).toBeNull());
  });

  // Menu button
  test("pressing menu button dispatches openDrawer", async () => {
    mockLoaded();
    const { UNSAFE_getAllByType } = renderWithProviders(<ShuttleSchedule />);
    const menuBtn = UNSAFE_getAllByType(Pressable)[0];
    await act(async () => { fireEvent.press(menuBtn); });
    expect(mockDispatch).toHaveBeenCalledWith("OPEN_DRAWER");
  });

  test("fills '—' when LOY has more entries than SGW", () => {
    const data: PartialSchedule = { monday: { LOY: ["07:00", "08:00", "09:00"], SGW: ["07:30"] } };
    mockLoaded(data);
    expect(renderWithProviders(<ShuttleSchedule />).getAllByText("—").length).toBeGreaterThanOrEqual(2);
  });

  test("fills '—' when SGW has more entries than LOY", () => {
    const data: PartialSchedule = { monday: { LOY: ["07:00"], SGW: ["07:30", "08:30", "09:30"] } };
    mockLoaded(data);
    expect(renderWithProviders(<ShuttleSchedule />).getAllByText("—").length).toBeGreaterThanOrEqual(2);
  });

  test("shows 0 departures when day arrays are empty", () => {
    const data: PartialSchedule = { monday: { LOY: [], SGW: [] } };
    mockLoaded(data);
    expect(renderWithProviders(<ShuttleSchedule />).getByText("0 departures")).toBeTruthy();
  });

  test("shows 0 departures when data has no entry for selected day", () => {
    mockLoaded({});
    expect(renderWithProviders(<ShuttleSchedule />).getByText("0 departures")).toBeTruthy();
  });
});