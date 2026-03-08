import type { Floor } from "@/hooks/queries/indoorMapQueries";
import { useSvgDimensions } from "@/hooks/useSvgDimensions";
import { renderWithProviders } from "@/test_utils/renderUtils";
import { fireEvent } from "@testing-library/react-native";
import FloorPlanViewer from "../components/indoor/FloorPlanViewer";

// Mock dependencies
jest.mock("@/hooks/useSvgDimensions");

jest.mock("@openspacelabs/react-native-zoomable-view", () => {
  const React = require("react");
  const { View } = require("react-native");

  return {
    ReactNativeZoomableView: React.forwardRef(({ children }: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        zoomTo: jest.fn(),
        moveTo: jest.fn(),
      }));
      return <View testID="zoomable-view">{children}</View>;
    }),
  };
});

jest.mock("../components/indoor/PolygonOverlay", () => {
  const { View, Text } = require("react-native");

  return function MockPolygonOverlay({ selectedPoiName }: any) {
    return (
      <View testID="polygon-overlay">
        {selectedPoiName ? (
          <Text testID="selected-poi">{selectedPoiName}</Text>
        ) : null}
      </View>
    );
  };
});

jest.mock("../components/indoor/PoiMarker", () => {
  const { Pressable, Text } = require("react-native");

  return function MockPoiMarker({ poi, onPress }: any) {
    return (
      <Pressable testID="poi-marker" onPress={onPress}>
        <Text>{poi.name}</Text>
      </Pressable>
    );
  };
});

jest.mock("../components/indoor/IndoorBottomSheetSection", () => {
  const { View, Text, Pressable } = require("react-native");

  return function MockIndoorBottomSheetSection({
    selectedPoiName,
    onClearSelectedPoi,
    onDirectionsPress,
    directionsDisabled,
  }: any) {
    return (
      <View testID="indoor-bottom-sheet-section">
        <Text testID="bottom-sheet-selected-poi">
          {selectedPoiName ?? "none"}
        </Text>
        <Text testID="directions-disabled">{String(directionsDisabled)}</Text>

        <Pressable testID="clear-selected-poi" onPress={onClearSelectedPoi}>
          <Text>clear</Text>
        </Pressable>

        <Pressable testID="directions-press" onPress={onDirectionsPress}>
          <Text>directions</Text>
        </Pressable>
      </View>
    );
  };
});

jest.mock("../components/indoor/IndoorPathOverlay", () => {
  const { View, Text } = require("react-native");

  return function MockIndoorPathOverlay({ color }: any) {
    return (
      <View testID="indoor-path-overlay">
        <Text>{color}</Text>
      </View>
    );
  };
});

jest.mock("@/hooks/useIndoorNavigationStore", () => ({
  useIndoorNavigationStore: jest.fn((selector) =>
    selector({
      mode: "BROWSE",
      end: null,
      start: null,
      selectedRoom: null,
      setSelectedRoom: jest.fn(),
      enterItineraryFromSelected: jest.fn(),
    }),
  ),
}));

jest.mock("@/hooks/useIndoorSearchStore", () => ({
  useIndoorSearchStore: jest.fn((selector) =>
    selector({
      clearSelectedPoiFilter: jest.fn(),
    }),
  ),
}));

const mockFloor: Floor = {
  number: 1,
  name: "Floor 1",
  imgPath: "floormaps/H_1.svg",
  vertices: [],
  edges: [],
  pois: [
    {
      name: "Room 101",
      type: "room",
      position: { x: 0.5, y: 0.5 },
      polygon: [
        { x: 0.4, y: 0.4 },
        { x: 0.6, y: 0.4 },
        { x: 0.6, y: 0.6 },
        { x: 0.4, y: 0.6 },
      ],
    },
    {
      name: "Bathroom",
      type: "bathroom",
      position: { x: 0.2, y: 0.3 },
      polygon: [],
    },
  ],
};

describe("FloorPlanViewer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("renders empty state when no floor is provided", () => {
    (useSvgDimensions as jest.Mock).mockReturnValue({
      dimensions: null,
      svgText: null,
      error: false,
      isLoading: false,
    });

    const { getByText } = renderWithProviders(
      <FloorPlanViewer
        floor={undefined}
        buildingCode="CC"
        buildingName="CC Building"
      />,
    );

    expect(getByText("No floor plan available")).toBeTruthy();
  });

  test("renders error state when SVG fails to load", () => {
    (useSvgDimensions as jest.Mock).mockReturnValue({
      dimensions: null,
      svgText: null,
      error: true,
      isLoading: false,
    });

    const { getByText } = renderWithProviders(
      <FloorPlanViewer
        floor={mockFloor}
        buildingCode="CC"
        buildingName="CC Building"
      />,
    );

    expect(getByText("Failed to load floor plan")).toBeTruthy();
  });

  test("renders loading state when SVG is loading", () => {
    (useSvgDimensions as jest.Mock).mockReturnValue({
      dimensions: null,
      svgText: null,
      error: false,
      isLoading: true,
    });

    const { getByText } = renderWithProviders(
      <FloorPlanViewer
        floor={mockFloor}
        buildingCode="CC"
        buildingName="CC Building"
      />,
    );

    expect(getByText("Loading floor plan...")).toBeTruthy();
  });

  test("renders loading state when dimensions are missing", () => {
    (useSvgDimensions as jest.Mock).mockReturnValue({
      dimensions: null,
      svgText: "<svg></svg>",
      error: false,
      isLoading: false,
    });

    const { getByText } = renderWithProviders(
      <FloorPlanViewer
        floor={mockFloor}
        buildingCode="CC"
        buildingName="CC Building"
      />,
    );

    expect(getByText("Loading floor plan...")).toBeTruthy();
  });

  test("renders loading state when svgText is missing", () => {
    (useSvgDimensions as jest.Mock).mockReturnValue({
      dimensions: { width: 1000, height: 1000 },
      svgText: null,
      error: false,
      isLoading: false,
    });

    const { getByText } = renderWithProviders(
      <FloorPlanViewer
        floor={mockFloor}
        buildingCode="CC"
        buildingName="CC Building"
      />,
    );

    expect(getByText("Loading floor plan...")).toBeTruthy();
  });

  test("renders floor plan with SVG, polygons, and POIs when data is loaded", () => {
    (useSvgDimensions as jest.Mock).mockReturnValue({
      dimensions: { width: 1000, height: 1000 },
      svgText: "<svg><rect /></svg>",
      error: false,
      isLoading: false,
    });

    const { getByTestId, getAllByTestId } = renderWithProviders(
      <FloorPlanViewer
        floor={mockFloor}
        buildingCode="CC"
        buildingName="CC Building"
      />,
    );

    expect(getByTestId("zoomable-view")).toBeTruthy();
    expect(getByTestId("polygon-overlay")).toBeTruthy();
    expect(getAllByTestId("poi-marker")).toHaveLength(2);
  });

  test("resets zoom when floor number changes", () => {
    (useSvgDimensions as jest.Mock).mockReturnValue({
      dimensions: { width: 1000, height: 1000 },
      svgText: "<svg></svg>",
      error: false,
      isLoading: false,
    });

    const { rerender, getByTestId } = renderWithProviders(
      <FloorPlanViewer
        floor={mockFloor}
        buildingCode="CC"
        buildingName="CC Building"
      />,
    );

    const newFloor = { ...mockFloor, number: 2 };

    rerender(
      <FloorPlanViewer
        floor={newFloor}
        buildingCode="CC"
        buildingName="CC Building"
      />,
    );

    jest.advanceTimersByTime(150);

    expect(getByTestId("zoomable-view")).toBeTruthy();
  });

  test("calculates correct display dimensions based on SVG aspect ratio", () => {
    (useSvgDimensions as jest.Mock).mockReturnValue({
      dimensions: { width: 2000, height: 1000 },
      svgText: "<svg></svg>",
      error: false,
      isLoading: false,
    });

    const { getByTestId } = renderWithProviders(
      <FloorPlanViewer
        floor={mockFloor}
        buildingCode="CC"
        buildingName="CC Building"
      />,
    );

    expect(getByTestId("zoomable-view")).toBeTruthy();
  });

  test("updates selectedPoiName when POI marker is pressed", () => {
    (useSvgDimensions as jest.Mock).mockReturnValue({
      dimensions: { width: 1000, height: 1000 },
      svgText: "<svg></svg>",
      error: false,
      isLoading: false,
    });

    const { getAllByTestId, getByTestId, queryByTestId } = renderWithProviders(
      <FloorPlanViewer
        floor={mockFloor}
        buildingCode="CC"
        buildingName="CC Building"
      />,
    );

    const poiMarkers = getAllByTestId("poi-marker");
    expect(poiMarkers).toHaveLength(2);

    expect(queryByTestId("selected-poi")).toBeNull();

    fireEvent.press(poiMarkers[0]);

    const selectedPoi = getByTestId("selected-poi");
    expect(selectedPoi).toBeTruthy();
    expect(selectedPoi).toHaveTextContent("Room 101");
  });

  test("clears selectedPoiName when close button is pressed", () => {
    (useSvgDimensions as jest.Mock).mockReturnValue({
      dimensions: { width: 1000, height: 1000 },
      svgText: "<svg></svg>",
      error: false,
      isLoading: false,
    });

    const { getAllByTestId, getByTestId, queryByTestId } = renderWithProviders(
      <FloorPlanViewer
        floor={mockFloor}
        buildingCode="CC"
        buildingName="CC Building"
      />,
    );

    const poiMarkers = getAllByTestId("poi-marker");

    fireEvent.press(poiMarkers[0]);
    expect(getByTestId("selected-poi")).toBeTruthy();
    expect(getByTestId("selected-poi")).toHaveTextContent("Room 101");

    fireEvent.press(getByTestId("clear-selected-poi"));

    expect(queryByTestId("selected-poi")).toBeNull();
  });

  test("calls onSelectPoiName when provided", () => {
    const onSelectPoiName = jest.fn();

    (useSvgDimensions as jest.Mock).mockReturnValue({
      dimensions: { width: 1000, height: 1000 },
      svgText: "<svg></svg>",
      error: false,
      isLoading: false,
    });

    const { getAllByTestId } = renderWithProviders(
      <FloorPlanViewer
        floor={mockFloor}
        buildingCode="CC"
        buildingName="CC Building"
        onSelectPoiName={onSelectPoiName}
      />,
    );

    fireEvent.press(getAllByTestId("poi-marker")[0]);

    expect(onSelectPoiName).toHaveBeenCalledWith("Room 101");
  });

  test("does not select poi when disablePoiSelection is true", () => {
    (useSvgDimensions as jest.Mock).mockReturnValue({
      dimensions: { width: 1000, height: 1000 },
      svgText: "<svg></svg>",
      error: false,
      isLoading: false,
    });

    const { getAllByTestId, queryByTestId } = renderWithProviders(
      <FloorPlanViewer
        floor={mockFloor}
        buildingCode="CC"
        buildingName="CC Building"
        disablePoiSelection
      />,
    );

    fireEvent.press(getAllByTestId("poi-marker")[0]);

    expect(queryByTestId("selected-poi")).toBeNull();
  });

  test("preselects initialSelectedRoom in browse mode", () => {
    (useSvgDimensions as jest.Mock).mockReturnValue({
      dimensions: { width: 1000, height: 1000 },
      svgText: "<svg></svg>",
      error: false,
      isLoading: false,
    });

    const { getByTestId } = renderWithProviders(
      <FloorPlanViewer
        floor={mockFloor}
        buildingCode="CC"
        buildingName="CC Building"
        initialSelectedRoom="Room 101"
      />,
    );

    expect(getByTestId("selected-poi")).toHaveTextContent("Room 101");
  });

  test("renders bottom sheet section when building props are provided", () => {
    (useSvgDimensions as jest.Mock).mockReturnValue({
      dimensions: { width: 1000, height: 1000 },
      svgText: "<svg></svg>",
      error: false,
      isLoading: false,
    });

    const { getByTestId } = renderWithProviders(
      <FloorPlanViewer
        floor={mockFloor}
        buildingCode="CC"
        buildingName="CC Building"
      />,
    );

    expect(getByTestId("indoor-bottom-sheet-section")).toBeTruthy();
  });

  test("hides bottom sheet section when hideBottomSheetSection is true", () => {
    (useSvgDimensions as jest.Mock).mockReturnValue({
      dimensions: { width: 1000, height: 1000 },
      svgText: "<svg></svg>",
      error: false,
      isLoading: false,
    });

    const { queryByTestId } = renderWithProviders(
      <FloorPlanViewer
        floor={mockFloor}
        buildingCode="CC"
        buildingName="CC Building"
        hideBottomSheetSection
      />,
    );

    expect(queryByTestId("indoor-bottom-sheet-section")).toBeNull();
  });

  test("renders route overlay with accessible color when requireAccessible is true", () => {
    (useSvgDimensions as jest.Mock).mockReturnValue({
      dimensions: { width: 1000, height: 1000 },
      svgText: "<svg></svg>",
      error: false,
      isLoading: false,
    });

    const { getByTestId } = renderWithProviders(
      <FloorPlanViewer
        floor={mockFloor}
        buildingCode="CC"
        buildingName="CC Building"
        routePath={[
          { x: 0.1, y: 0.1 },
          { x: 0.5, y: 0.5 },
        ]}
        requireAccessible
      />,
    );

    expect(getByTestId("indoor-path-overlay")).toBeTruthy();
  });

  test("clear button clears selected poi", () => {
    (useSvgDimensions as jest.Mock).mockReturnValue({
      dimensions: { width: 1000, height: 1000 },
      svgText: "<svg></svg>",
      error: false,
      isLoading: false,
    });

    const { getAllByTestId, getByTestId, queryByTestId } = renderWithProviders(
      <FloorPlanViewer
        floor={mockFloor}
        buildingCode="CC"
        buildingName="CC Building"
      />,
    );

    fireEvent.press(getAllByTestId("poi-marker")[0]);
    expect(getByTestId("selected-poi")).toBeTruthy();

    fireEvent.press(getByTestId("clear-selected-poi"));
    expect(queryByTestId("selected-poi")).toBeNull();
  });
});

import { isNoAccessibleRouteError } from "../components/indoor/FloorPlanViewer";

test("isNoAccessibleRouteError returns true for Error with matching message", () => {
  expect(
    isNoAccessibleRouteError(new Error("No transition point found")),
  ).toBe(true);
});

test("isNoAccessibleRouteError returns true for string payload", () => {
  expect(isNoAccessibleRouteError("no transition point available")).toBe(true);
});

test("isNoAccessibleRouteError returns false for unrelated error", () => {
  expect(isNoAccessibleRouteError(new Error("network fail"))).toBe(false);
  expect(isNoAccessibleRouteError(null)).toBe(false);
});

test("selectedPoiName prop overrides local selected state", () => {
  (useSvgDimensions as jest.Mock).mockReturnValue({
    dimensions: { width: 1000, height: 1000 },
    svgText: "<svg></svg>",
    error: false,
    isLoading: false,
  });

  const { getByTestId } = renderWithProviders(
    <FloorPlanViewer
      floor={mockFloor}
      buildingCode="CC"
      buildingName="CC Building"
      selectedPoiName="Bathroom"
    />,
  );

  expect(getByTestId("selected-poi")).toHaveTextContent("Bathroom");
});

test("does not preselect initialSelectedRoom when poi does not exist", () => {
  (useSvgDimensions as jest.Mock).mockReturnValue({
    dimensions: { width: 1000, height: 1000 },
    svgText: "<svg></svg>",
    error: false,
    isLoading: false,
  });

  const { queryByTestId } = renderWithProviders(
    <FloorPlanViewer
      floor={mockFloor}
      buildingCode="CC"
      buildingName="CC Building"
      initialSelectedRoom="Missing Room"
    />,
  );

  expect(queryByTestId("selected-poi")).toBeNull();
});

test("does not render route overlay when route path has less than 2 points", () => {
  (useSvgDimensions as jest.Mock).mockReturnValue({
    dimensions: { width: 1000, height: 1000 },
    svgText: "<svg></svg>",
    error: false,
    isLoading: false,
  });

  const { queryByTestId } = renderWithProviders(
    <FloorPlanViewer
      floor={mockFloor}
      buildingCode="CC"
      buildingName="CC Building"
      routePath={[{ x: 0.1, y: 0.1 }]}
    />,
  );

  expect(queryByTestId("indoor-path-overlay")).toBeNull();
});

test("calls directions press from bottom sheet", () => {
  const enterItineraryFromSelected = jest.fn();

  const { useIndoorNavigationStore } = require("@/hooks/useIndoorNavigationStore");
  useIndoorNavigationStore.mockImplementation((selector: any) =>
    selector({
      mode: "BROWSE",
      end: null,
      start: null,
      selectedRoom: { label: "Room 101" },
      setSelectedRoom: jest.fn(),
      enterItineraryFromSelected,
    }),
  );

  (useSvgDimensions as jest.Mock).mockReturnValue({
    dimensions: { width: 1000, height: 1000 },
    svgText: "<svg></svg>",
    error: false,
    isLoading: false,
  });

  const { getByTestId } = renderWithProviders(
    <FloorPlanViewer
      floor={mockFloor}
      buildingCode="CC"
      buildingName="CC Building"
    />,
  );

  fireEvent.press(getByTestId("directions-press"));
  expect(enterItineraryFromSelected).toHaveBeenCalled();
});