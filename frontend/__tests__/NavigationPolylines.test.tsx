import { DIRECTION_COLORS } from "@/app/constants";
import { directionPolylineStyles } from "@/app/styles/directionStyles";
import NavigationPolylines from "@/components/NavigationPolylines";
import {
  DirectionsModel,
  StepModel,
  TransitMode,
  useGetDirections,
} from "@/hooks/queries/navigationQueries";
import { useNavigationStore } from "@/hooks/useNavigationStore";
import { render, waitFor } from "@testing-library/react-native";
import React from "react";

const mockDecode = jest.fn();

jest.mock("@mapbox/polyline", () => ({
  __esModule: true,
  default: {
    decode: (...args: unknown[]) => mockDecode(...args),
  },
}));

jest.mock("react-native-maps", () => {
  const { View } = require("react-native");
  return {
    Polyline: ({ children, ...props }: any) => (
      <View testID="polyline" {...props}>
        {children}
      </View>
    ),
    Marker: ({ children, ...props }: any) => (
      <View testID="marker" {...props}>
        {children}
      </View>
    ),
  };
});

jest.mock("@/hooks/queries/navigationQueries", () => {
  const actual = jest.requireActual("@/hooks/queries/navigationQueries");
  return {
    ...actual,
    useGetDirections: jest.fn(),
  };
});

describe("NavigationPolylines", () => {
  const mockedUseGetDirections = useGetDirections as jest.Mock;

  const createStep = (overrides?: Partial<StepModel>): StepModel => ({
    instruction: "Walk straight",
    distance: "0.2 km",
    duration: "2 min",
    start: { latitude: 45.49, longitude: -73.57 },
    end: { latitude: 45.5, longitude: -73.58 },
    polyline: "encoded-step",
    ...overrides,
  });

  const createDirections = (
    overrides?: Partial<DirectionsModel>,
  ): DirectionsModel => ({
    mode: TransitMode.WALKING,
    duration: "12 min",
    distance: "1.4 km",
    departure_message: "Depart now",
    polyline: "route-polyline",
    steps: [createStep()],
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    useNavigationStore.setState({
      startLocation: {
        latitude: 45.497,
        longitude: -73.579,
        name: "Hall Building",
      },
      endLocation: {
        latitude: 45.501,
        longitude: -73.577,
        name: "EV Building",
      },
      transitMode: TransitMode.TRANSIT,
      currentDirections: undefined,
      setCurrentDirections: jest.fn(),
    });

    mockedUseGetDirections.mockReturnValue({ data: undefined });
    mockDecode.mockImplementation(() => [
      [45.49, -73.57],
      [45.5, -73.58],
    ]);
  });

  test("renders nothing when directions data is unavailable", () => {
    const { queryByTestId } = render(<NavigationPolylines />);

    expect(queryByTestId("polyline")).toBeNull();
    expect(queryByTestId("marker")).toBeNull();
    expect(useNavigationStore.getState().setCurrentDirections).not.toHaveBeenCalled();
  });

  test("renders polylines with decoded coordinates and applies step styling", async () => {
    const directions = createDirections({
      steps: [
        createStep({
          polyline: "transit-polyline",
          travel_mode: TransitMode.TRANSIT,
          transit_line_color: "#00ff00",
        }),
        createStep({
          polyline: "walking-polyline",
          travel_mode: TransitMode.WALKING,
        }),
        createStep({
          polyline: "shuttle-polyline",
          travel_mode: TransitMode.SHUTTLE,
        }),
      ],
    });

    mockedUseGetDirections.mockReturnValue({ data: directions });

    const { getAllByTestId } = render(<NavigationPolylines />);

    await waitFor(() => {
      expect(useNavigationStore.getState().setCurrentDirections).toHaveBeenCalledWith(
        directions,
      );
    });

    expect(mockDecode).toHaveBeenCalledTimes(3);
    expect(mockDecode).toHaveBeenCalledWith("transit-polyline");
    expect(mockDecode).toHaveBeenCalledWith("walking-polyline");
    expect(mockDecode).toHaveBeenCalledWith("shuttle-polyline");

    const polylines = getAllByTestId("polyline");
    expect(polylines).toHaveLength(3);

    expect(polylines[0].props.strokeWidth).toBe(
      directionPolylineStyles.transit.strokeWidth,
    );
    expect(polylines[0].props.strokeColor).toBe("#00ff00");
    expect(polylines[0].props.zIndex).toBe(directionPolylineStyles.transit.zIndex);
    expect(polylines[0].props.coordinates).toEqual([
      { latitude: 45.49, longitude: -73.57 },
      { latitude: 45.5, longitude: -73.58 },
    ]);

    expect(polylines[1].props.strokeColor).toBe(directionPolylineStyles.walking.strokeColor);
    expect(polylines[1].props.lineDashPattern).toEqual(
      directionPolylineStyles.walking.lineDashPattern,
    );

    expect(polylines[2].props.strokeColor).toBe(directionPolylineStyles.shuttle.strokeColor);
    expect(polylines[2].props.zIndex).toBe(directionPolylineStyles.shuttle.zIndex);
  });

  test("uses fallback transit color and renders endpoint marker when requested", () => {
    const directions = createDirections({
      steps: [
        createStep({
          polyline: "transit-no-color",
          travel_mode: TransitMode.TRANSIT,
          transit_line_color: undefined,
        }),
      ],
    });

    mockedUseGetDirections.mockReturnValue({ data: directions });

    const { getByTestId } = render(<NavigationPolylines showEndPoint />);

    const polylineView = getByTestId("polyline");
    expect(polylineView.props.strokeColor).toBe(DIRECTION_COLORS.transit);

    const marker = getByTestId("marker");
    expect(marker.props.coordinate).toEqual({
      latitude: 45.501,
      longitude: -73.577,
    });
  });

  test("handles missing step polyline by rendering empty coordinates", () => {
    const directions = createDirections({
      steps: [
        createStep({
          polyline: undefined,
          travel_mode: TransitMode.WALKING,
        }),
      ],
    });

    mockedUseGetDirections.mockReturnValue({ data: directions });

    const { getByTestId } = render(<NavigationPolylines />);

    expect(mockDecode).not.toHaveBeenCalled();
    expect(getByTestId("polyline").props.coordinates).toEqual([]);
  });
});
