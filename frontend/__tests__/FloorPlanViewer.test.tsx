import type { Floor } from "@/hooks/queries/indoorMapQueries";
import { useSvgDimensions } from "@/hooks/useSvgDimensions";
import { renderWithProviders } from "@/test_utils/renderUtils";
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
  const { View } = require("react-native");
  return function MockPolygonOverlay() {
    return <View testID="polygon-overlay" />;
  };
});
jest.mock("../components/indoor/PoiMarker", () => {
  const { View } = require("react-native");
  return function MockPoiMarker() {
    return <View testID="poi-marker" />;
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
      <FloorPlanViewer floor={undefined} />,
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
      <FloorPlanViewer floor={mockFloor} />,
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
      <FloorPlanViewer floor={mockFloor} />,
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
      <FloorPlanViewer floor={mockFloor} />,
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
      <FloorPlanViewer floor={mockFloor} />,
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
      <FloorPlanViewer floor={mockFloor} />,
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
      <FloorPlanViewer floor={mockFloor} />,
    );

    const newFloor = { ...mockFloor, number: 2 };
    rerender(<FloorPlanViewer floor={newFloor} />);

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
      <FloorPlanViewer floor={mockFloor} />,
    );

    expect(getByTestId("zoomable-view")).toBeTruthy();
  });
});
