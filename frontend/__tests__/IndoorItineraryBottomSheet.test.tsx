import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import IndoorItineraryBottomSheet from "@/components/indoor/IndoorItineraryBottomSheet";

const mockPush = jest.fn();
const mockExitItinerary = jest.fn();

jest.mock("@gorhom/bottom-sheet", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children }: any) => <View>{children}</View>;
});

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ bottom: 0 }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/app/constants", () => ({
  COLORS: { maroon: "#912338" },
}));

describe("IndoorItineraryBottomSheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when mode is not ITINERARY", () => {
    mockedStore.mockReturnValue({
      mode: "BROWSE",
    });

    const { queryByText } = render(
      <IndoorItineraryBottomSheet buildingCode="VL" />,
    );

    expect(queryByText("GO")).toBeNull();
  });

  it("renders distance and enables GO when route exists", () => {
    mockedStore.mockReturnValue({
      mode: "ITINERARY",
      start: { floor: 1 },
      end: { floor: 1 },
      routeSegments: [{ floorNumber: 1, distance: 10, path: [] }],
      totalDistance: 12.34,
      currentFloor: 1,
      routeError: null,
      exitItinerary: mockExitItinerary,
    });

    const { getByText } = render(
      <IndoorItineraryBottomSheet buildingCode="VL" />,
    );

    expect(getByText("Walk (12.3 m)")).toBeTruthy();
    expect(getByText("GO")).toBeTruthy();
    expect(getByText("Tap rooms on the map to set Start/End.")).toBeTruthy();
  });

  it("navigates on GO press when route is available", () => {
    mockedStore.mockReturnValue({
      mode: "ITINERARY",
      start: { floor: 1 },
      end: { floor: 1 },
      routeSegments: [{ floorNumber: 1, distance: 10, path: [] }],
      totalDistance: 12.34,
      currentFloor: 1,
      routeError: null,
      exitItinerary: mockExitItinerary,
    });

    const { getByText } = render(
      <IndoorItineraryBottomSheet buildingCode="VL" />,
    );

    fireEvent.press(getByText("GO"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/indoor-navigation",
      params: { buildingCode: "VL" },
    });
  });

  it("does not navigate when routeError exists", () => {
    mockedStore.mockReturnValue({
      mode: "ITINERARY",
      start: { floor: 1 },
      end: { floor: 1 },
      routeSegments: [{ floorNumber: 1, distance: 10, path: [] }],
      totalDistance: 12.34,
      currentFloor: 1,
      routeError: "No accessible indoor route is available for this trip.",
      exitItinerary: mockExitItinerary,
    });

    const { getByText } = render(
      <IndoorItineraryBottomSheet buildingCode="VL" />,
    );

    fireEvent.press(getByText("GO"));
    expect(mockPush).not.toHaveBeenCalled();
    expect(
      getByText("No accessible indoor route is available for this trip."),
    ).toBeTruthy();
  });

  it("shows cross-floor message when current floor is start floor", () => {
    mockedStore.mockReturnValue({
      mode: "ITINERARY",
      start: { floor: 1 },
      end: { floor: 2 },
      routeSegments: [{ floorNumber: 1, distance: 10, path: [] }],
      totalDistance: 20,
      currentFloor: 1,
      routeError: null,
      exitItinerary: mockExitItinerary,
    });

    const { getByText } = render(
      <IndoorItineraryBottomSheet buildingCode="VL" />,
    );

    expect(getByText("Floor change needed — go to Floor 2.")).toBeTruthy();
  });

  it("shows cross-floor message when current floor is end floor", () => {
    mockedStore.mockReturnValue({
      mode: "ITINERARY",
      start: { floor: 1 },
      end: { floor: 2 },
      routeSegments: [{ floorNumber: 1, distance: 10, path: [] }],
      totalDistance: 20,
      currentFloor: 2,
      routeError: null,
      exitItinerary: mockExitItinerary,
    });

    const { getByText } = render(
      <IndoorItineraryBottomSheet buildingCode="VL" />,
    );

    expect(getByText("Start is on Floor 1.")).toBeTruthy();
  });

  it("calls exitItinerary when close is pressed", () => {
    mockedStore.mockReturnValue({
      mode: "ITINERARY",
      start: { floor: 1 },
      end: { floor: 1 },
      routeSegments: [{ floorNumber: 1, distance: 10, path: [] }],
      totalDistance: 20,
      currentFloor: 1,
      routeError: null,
      exitItinerary: mockExitItinerary,
    });

    const { getByTestId } = render(
      <IndoorItineraryBottomSheet buildingCode="VL" />,
    );

    fireEvent.press(getByTestId("close-itinerary"));

    expect(mockExitItinerary).toHaveBeenCalled();
  });
});