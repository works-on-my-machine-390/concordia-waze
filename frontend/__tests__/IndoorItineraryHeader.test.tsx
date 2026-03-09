import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import IndoorItineraryHeader from "@/components/indoor/IndoorItineraryHeader";

const mockDispatch = jest.fn();
const mockPush = jest.fn();

const mockStore = {
  start: null as any,
  end: null as any,
  exitItinerary: jest.fn(),
  setSelectedRoom: jest.fn(),
  setPickMode: jest.fn(),
};

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 10 }),
}));

jest.mock("expo-router", () => ({
  useNavigation: () => ({
    dispatch: mockDispatch,
  }),
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock("@react-navigation/native", () => ({
  DrawerActions: {
    openDrawer: () => ({ type: "OPEN_DRAWER" }),
  },
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/app/constants", () => ({
  COLORS: {
    maroon: "#912338",
    textSecondary: "#777",
    textPrimary: "#111",
  },
}));

jest.mock("@/app/icons", () => ({
  CircleIcon: () => null,
  LocationIcon: () => null,
}));

jest.mock("@/hooks/useIndoorNavigationStore", () => ({
  useIndoorNavigationStore: jest.fn(() => mockStore),
}));

describe("IndoorItineraryHeader", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.start = null;
    mockStore.end = null;
  });

  it("renders default start and end labels", () => {
    const { getByText, getByTestId } = render(
      <IndoorItineraryHeader
        buildingCode="VL"
        buildingName="Vanier Library"
      />,
    );

    expect(getByTestId("indoor-itinerary-header")).toBeTruthy();
    expect(getByText("Select start")).toBeTruthy();
    expect(getByText("Select destination")).toBeTruthy();
  });

  it("renders display labels when available", () => {
    mockStore.start = {
      label: "Start A",
      displayLabel: "Hall Building",
    };
    mockStore.end = {
      label: "End B",
      displayLabel: "Library Entrance",
    };

    const { getByText } = render(
      <IndoorItineraryHeader
        buildingCode="VL"
        buildingName="Vanier Library"
      />,
    );

    expect(getByText("Hall Building")).toBeTruthy();
    expect(getByText("Library Entrance")).toBeTruthy();
  });

  it("opens drawer when menu is pressed", () => {
    const { getByTestId } = render(
      <IndoorItineraryHeader
        buildingCode="VL"
        buildingName="Vanier Library"
      />,
    );

    fireEvent.press(getByTestId("open-drawer-btn"));

    expect(mockDispatch).toHaveBeenCalledWith({ type: "OPEN_DRAWER" });
  });

  it("handles back press by exiting itinerary and clearing selected room", () => {
    const { getByTestId } = render(
      <IndoorItineraryHeader
        buildingCode="VL"
        buildingName="Vanier Library"
      />,
    );

    fireEvent.press(getByTestId("itinerary-back-btn"));

    expect(mockStore.exitItinerary).toHaveBeenCalled();
    expect(mockStore.setSelectedRoom).toHaveBeenCalledWith(null);
  });

  it("sets pick mode to start and navigates to indoor search", () => {
    const { getByText } = render(
      <IndoorItineraryHeader
        buildingCode="VL"
        buildingName="Vanier Library"
      />,
    );

    fireEvent.press(getByText("Select start"));

    expect(mockStore.setPickMode).toHaveBeenCalledWith("start");
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/indoor-search",
      params: {
        buildingCode: "VL",
        buildingName: "Vanier Library",
        itineraryField: "start",
      },
    });
  });

  it("sets pick mode to end and navigates to indoor search", () => {
    const { getByText } = render(
      <IndoorItineraryHeader
        buildingCode="VL"
        buildingName="Vanier Library"
      />,
    );

    fireEvent.press(getByText("Select destination"));

    expect(mockStore.setPickMode).toHaveBeenCalledWith("end");
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/indoor-search",
      params: {
        buildingCode: "VL",
        buildingName: "Vanier Library",
        itineraryField: "end",
      },
    });
  });
});