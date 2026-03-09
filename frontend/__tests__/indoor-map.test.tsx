import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import IndoorMapPage from "@/app/(drawer)/indoor-map";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockToggleAccessibilityMode = jest.fn();

const mockNavState = {
  mode: "BROWSE",
  currentFloor: 2,
  exitItinerary: jest.fn(),
  setSelectedRoom: jest.fn(),
  setPickMode: jest.fn(),
  setStart: jest.fn(),
  setEnd: jest.fn(),
  clearRoute: jest.fn(),
  setCurrentFloor: jest.fn(),
};

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useLocalSearchParams: () => ({
    buildingCode: "VL",
    selectedRoom: "H-820",
    selectedFloor: "8",
  }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ bottom: 0 }),
}));

jest.mock("@/hooks/useIndoorNavigationStore", () => ({
  useIndoorNavigationStore: jest.fn(() => mockNavState),
}));

jest.mock("@/hooks/useIndoorItineraryController", () => ({
  useIndoorItineraryController: jest.fn(() => ({
    routeSegments: [{ floorNumber: 2, distance: 10, path: [] }],
  })),
}));

jest.mock("@/hooks/queries/buildingQueries", () => ({
  useGetBuildingDetails: jest.fn(() => ({
    data: { long_name: "Vanier Library" },
  })),
}));

jest.mock("@/hooks/useMapSettings", () => ({
  __esModule: true,
  MapSettings: {
    preferAccessibleRoutes: "preferAccessibleRoutes",
  },
  default: jest.fn(() => ({
    mapSettings: {
      preferAccessibleRoutes: true,
    },
    updateSetting: mockToggleAccessibilityMode,
  })),
}));

jest.mock("@/components/indoor/IndoorMapContainer", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function MockIndoorMapContainer(props: any) {
    return (
      <Text testID="indoor-map-container">
        {JSON.stringify({
          buildingCode: props.buildingCode,
          preferredFloorNumber: props.preferredFloorNumber,
          floorSelectorBottomOffset: props.floorSelectorBottomOffset,
          selectedRoomFromSearch: props.selectedRoomFromSearch,
          selectedFloorFromSearch: props.selectedFloorFromSearch,
          requireAccessible: props.requireAccessible,
        })}
      </Text>
    );
  };
});

jest.mock("@/components/indoor/IndoorMapHeader", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return function MockIndoorMapHeader(props: any) {
    return (
      <>
        <Text testID="indoor-map-header">IndoorMapHeader</Text>
        <Pressable testID="search-btn" onPress={props.onSearchPress}>
          <Text>search</Text>
        </Pressable>
        <Pressable testID="back-btn" onPress={props.onBackToOutdoor}>
          <Text>back</Text>
        </Pressable>
        <Pressable
          testID="accessibility-btn"
          onPress={props.onAccessibilityToggle}
        >
          <Text>{String(props.isAccessibilityMode)}</Text>
        </Pressable>
      </>
    );
  };
});

jest.mock("@/components/indoor/IndoorItineraryHeader", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function MockIndoorItineraryHeader() {
    return <Text testID="itinerary-header">IndoorItineraryHeader</Text>;
  };
});

jest.mock("@/components/indoor/IndoorItineraryBottomSheet", () => {
  const React = require("react");
  const { Text } = require("react-native");
  const Mock = ({ buildingCode }: any) => (
    <Text testID="itinerary-bottom-sheet">{buildingCode}</Text>
  );
  Mock.ITINERARY_SHEET_HEIGHT = 165;
  return {
    __esModule: true,
    default: Mock,
    ITINERARY_SHEET_HEIGHT: 165,
  };
});

describe("IndoorMapPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavState.mode = "BROWSE";
    mockNavState.currentFloor = 2;
  });

  it("renders browse mode with map header and passes props to map container", () => {
    const { getByTestId, queryByTestId } = render(<IndoorMapPage />);

    expect(getByTestId("indoor-map-header")).toBeTruthy();
    expect(queryByTestId("itinerary-header")).toBeNull();

    const container = getByTestId("indoor-map-container");
    expect(container.props.children).toContain('"buildingCode":"VL"');
    expect(container.props.children).toContain('"preferredFloorNumber":2');
    expect(container.props.children).toContain('"selectedRoomFromSearch":"H-820"');
    expect(container.props.children).toContain('"selectedFloorFromSearch":8');
    expect(container.props.children).toContain('"requireAccessible":true');
  });

  it("navigates to indoor search on search press", () => {
    const { getByTestId } = render(<IndoorMapPage />);

    fireEvent.press(getByTestId("search-btn"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/indoor-search",
      params: {
        buildingCode: "VL",
        buildingName: "Vanier Library",
      },
    });
  });

  it("calls accessibility toggle", () => {
    const { getByTestId } = render(<IndoorMapPage />);
    fireEvent.press(getByTestId("accessibility-btn"));
    expect(mockToggleAccessibilityMode).toHaveBeenCalled();
  });

  it("resets and goes back to outdoor map", () => {
    const { getByTestId } = render(<IndoorMapPage />);

    fireEvent.press(getByTestId("back-btn"));

    expect(mockNavState.exitItinerary).toHaveBeenCalled();
    expect(mockNavState.setSelectedRoom).toHaveBeenCalledWith(null);
    expect(mockNavState.setPickMode).toHaveBeenCalledWith("start");
    expect(mockNavState.setStart).toHaveBeenCalledWith(null);
    expect(mockNavState.setEnd).toHaveBeenCalledWith(null);
    expect(mockNavState.clearRoute).toHaveBeenCalled();
    expect(mockNavState.setCurrentFloor).toHaveBeenCalledWith(null);
    expect(mockReplace).toHaveBeenCalledWith("/map");
  });

  it("renders itinerary mode with itinerary header and bottom sheet", () => {
    mockNavState.mode = "ITINERARY";

    const { getByTestId, queryByTestId } = render(<IndoorMapPage />);

    expect(getByTestId("itinerary-header")).toBeTruthy();
    expect(getByTestId("itinerary-bottom-sheet")).toBeTruthy();
    expect(queryByTestId("indoor-map-header")).toBeNull();
  });
});