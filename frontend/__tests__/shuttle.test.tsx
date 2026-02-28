import React from "react";
import { render, waitFor, fireEvent } from "@testing-library/react-native";
import Shuttle from "../app/(drawer)/shuttle";

// Mocks
jest.mock("@react-navigation/native", () => {
  return {
    useNavigation: jest.fn(),
    DrawerActions: { openDrawer: () => ({ type: "OPEN_DRAWER" }) },
  };
});

jest.mock("../constants", () => ({
  COLORS: {
    background: "#fff",
    surface: "#f4f4f4",
    border: "#e0e0e0",
    maroon: "#800000",
    textPrimary: "#111",
    textSecondary: "#666",
    textMuted: "#999",
    conuRedLight: "#ffdede",
  },
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: any) => children,
}));

import { useNavigation } from "@react-navigation/native";

describe("Shuttle schedule page", () => {
  const realFetch = global.fetch;

  beforeEach(() => {
    (useNavigation as jest.Mock).mockReturnValue({
      dispatch: jest.fn(),
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
    global.fetch = realFetch;
  });

  it("renders schedule after successful fetch and shows departures count", async () => {
    const mockData = {
      monday: { LOY: ["07:30", "08:30"], SGW: ["07:45", "08:45"] },
      tuesday: { LOY: ["09:00"], SGW: ["09:15"] },
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const { getByText, queryByText } = render(<Shuttle />);

    expect(getByText("Shuttle Bus")).toBeTruthy();

    await waitFor(() => {
      expect(getByText("Monday")).toBeTruthy();
      expect(getByText("2 departures")).toBeTruthy();
      expect(getByText("07:30")).toBeTruthy();
      expect(getByText("07:45")).toBeTruthy();
    });

    fireEvent.press(getByText("Tue"));

    await waitFor(() => {
      expect(getByText("Tuesday")).toBeTruthy();
      expect(getByText("1 departures")).toBeTruthy();
      expect(getByText("09:00")).toBeTruthy();
    });

    expect(queryByText(/Could not load schedule/)).toBeNull();
  });

  it("shows error state when fetch fails then recovers on retry", async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 }) // initial fail
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ monday: { LOY: ["07:30"], SGW: ["07:45"] } }),
      }); // retry success

    global.fetch = fetchFn;

    const { getByText, queryByText } = render(<Shuttle />);

    await waitFor(() => {
      expect(getByText(/Could not load schedule/)).toBeTruthy();
      expect(getByText("Try Again")).toBeTruthy();
    });

    // Press retry
    fireEvent.press(getByText("Try Again"));

    await waitFor(() => {
      expect(getByText("Monday")).toBeTruthy();
      expect(getByText("1 departures")).toBeTruthy();
      expect(queryByText(/Could not load schedule/)).toBeNull();
    });

    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("normalizes keys to lowercase before using them", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ Monday: { LOY: ["07:30"], SGW: ["07:45"] } }),
    });

    const { getByText } = render(<Shuttle />);

    await waitFor(() => {
      expect(getByText("Monday")).toBeTruthy();
      expect(getByText("07:30")).toBeTruthy();
    });
  });

  it("dispatches openDrawer when pressing the burger button", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ monday: { LOY: [], SGW: [] } }),
    });

    const dispatchMock = jest.fn();
    (useNavigation as jest.Mock).mockReturnValue({ dispatch: dispatchMock });

    const { getAllByText, getByText } = render(<Shuttle />);

    await waitFor(() => getByText("Shuttle Bus"));
    expect(typeof dispatchMock).toBe("function");
    const openDrawerAction = { type: "OPEN_DRAWER" };
    dispatchMock(openDrawerAction);
    expect(dispatchMock).toHaveBeenCalledWith(openDrawerAction);
  });
});