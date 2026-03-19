import type { Floor } from "@/hooks/queries/indoorMapQueries";
import { useSvgDimensions } from "@/hooks/useSvgDimensions";
import { renderWithProviders } from "@/test_utils/renderUtils";
import { fireEvent } from "@testing-library/react-native";
import FloorPlanViewer from "../components/indoor/FloorPlanViewer";

const mockSetParams = jest.fn();

jest.mock("@/hooks/useSvgDimensions");

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({
    buildingCode: "CC",
    selectedFloor: "1",
    selectedPoiName: undefined,
  }),
  useRouter: () => ({
    setParams: (...args: any[]) => mockSetParams(...args),
  }),
}));

jest.mock("@/hooks/useStartLocation", () => ({
  __esModule: true,
  default: () => ({
    setStartLocationManually: jest.fn(),
  }),
}));

jest.mock("@openspacelabs/react-native-zoomable-view", () => {
  const React = require("react");
  const { View } = require("react-native");

  return {
    ReactNativeZoomableView: ({ children }: any) => (
      <View testID="zoomable-view">{children}</View>
    ),
  };
});

jest.mock("react-native-svg", () => {
  const { View } = require("react-native");
  return {
    SvgXml: () => <View testID="svg-xml" />,
  };
});

jest.mock("../components/indoor/IndoorBottomSheetSection", () => {
  const { View } = require("react-native");
  return function MockIndoorBottomSheetSection() {
    return <View testID="indoor-bottom-sheet-section" />;
  };
});

jest.mock("../components/indoor/IndoorPathOverlay", () => {
  const { View } = require("react-native");
  return function MockIndoorPathOverlay() {
    return <View testID="indoor-path-overlay" />;
  };
});

jest.mock("../components/indoor/PolygonOverlay", () => {
  const { Pressable } = require("react-native");
  return function MockPolygonOverlay({ onSelectPoi }: any) {
    return (
      <Pressable
        testID="polygon-overlay"
        onPress={() =>
          onSelectPoi?.({
            name: "Room 101",
            type: "room",
            position: { x: 0.5, y: 0.5 },
          })
        }
      />
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
      ],
      floor_number: 1,
      latitude: 45.497,
      longitude: -73.579,
      building: "CC",
    },
  ],
};

describe("FloorPlanViewer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders empty state when no floor is provided", () => {
    (useSvgDimensions as jest.Mock).mockReturnValue({
      dimensions: null,
      svgText: null,
      error: false,
      isLoading: false,
    });

    const { getByText } = renderWithProviders(
      <FloorPlanViewer floor={undefined} buildingName="CC Building" />,
    );

    expect(getByText("No floor plan available")).toBeTruthy();
  });

  test("renders loading state", () => {
    (useSvgDimensions as jest.Mock).mockReturnValue({
      dimensions: null,
      svgText: null,
      error: false,
      isLoading: true,
    });

    const { getByText } = renderWithProviders(
      <FloorPlanViewer floor={mockFloor} buildingName="CC Building" />,
    );

    expect(getByText("Loading floor plan...")).toBeTruthy();
  });

  test("renders floor plan pieces when svg data is ready", () => {
    (useSvgDimensions as jest.Mock).mockReturnValue({
      dimensions: { width: 1000, height: 1000 },
      svgText: "<svg></svg>",
      error: false,
      isLoading: false,
    });

    const { getByTestId, getAllByTestId } = renderWithProviders(
      <FloorPlanViewer floor={mockFloor} buildingName="CC Building" />,
    );

    expect(getByTestId("zoomable-view")).toBeTruthy();
    expect(getByTestId("svg-xml")).toBeTruthy();
    expect(getByTestId("polygon-overlay")).toBeTruthy();
    expect(getAllByTestId("poi-marker")).toHaveLength(1);
  });

  test("selecting a POI updates selectedPoiName route param", () => {
    (useSvgDimensions as jest.Mock).mockReturnValue({
      dimensions: { width: 1000, height: 1000 },
      svgText: "<svg></svg>",
      error: false,
      isLoading: false,
    });

    const { getByTestId } = renderWithProviders(
      <FloorPlanViewer floor={mockFloor} buildingName="CC Building" />,
    );

    fireEvent.press(getByTestId("poi-marker"));

    expect(mockSetParams).toHaveBeenCalledWith({ selectedPoiName: "Room 101" });
  });
});
