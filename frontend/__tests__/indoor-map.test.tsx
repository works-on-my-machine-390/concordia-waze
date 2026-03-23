import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import IndoorMapPage from "@/app/(drawer)/indoor-map";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockSetParams = jest.fn();
const mockToggleAccessibilityMode = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    setParams: mockSetParams,
  }),
  useLocalSearchParams: () => ({
    buildingCode: "VL",
    selectedFloor: "8",
    selectedPoiName: "H-820",
  }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ bottom: 0 }),
}));

jest.mock("@/hooks/queries/indoorMapQueries", () => ({
  useGetBuildingFloors: jest.fn(() => ({
    data: { floors: [{ number: 8 }, { number: 9 }] },
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

jest.mock("@/lib/telemetry", () => ({
  trackEvent: jest.fn(() => Promise.resolve()),
}));

jest.mock("@/components/indoor/IndoorMapContainer", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function MockIndoorMapContainer(props: any) {
    return (
      <Text testID="indoor-map-container">
        {JSON.stringify({
          buildingCode: props.buildingCode,
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

describe("IndoorMapPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders map header and passes props to map container", () => {
    const { getByTestId } = render(<IndoorMapPage />);

    expect(getByTestId("indoor-map-header")).toBeTruthy();
    const container = getByTestId("indoor-map-container");
    expect(container.props.children).toContain('"buildingCode":"VL"');
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
        previouslySelectedFloor: "8",
      },
    });
  });

  it("toggles accessibility mode", () => {
    const { getByTestId } = render(<IndoorMapPage />);

    fireEvent.press(getByTestId("accessibility-btn"));

    expect(mockToggleAccessibilityMode).toHaveBeenCalled();
  });

  it("returns to outdoor map on back", () => {
    const { getByTestId } = render(<IndoorMapPage />);

    fireEvent.press(getByTestId("back-btn"));

    expect(mockReplace).toHaveBeenCalledWith("/map");
  });
});
