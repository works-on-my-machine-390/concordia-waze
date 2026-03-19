import { DIRECTION_COLORS } from "@/app/constants";
import { directionPolylineStyles } from "@/app/styles/directionStyles";
import NavigationPolylines from "@/components/NavigationPolylines";
import { TransitMode } from "@/hooks/queries/navigationQueries";
import { useNavigationStore } from "@/hooks/useNavigationStore";
import { render } from "@testing-library/react-native";
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

describe("NavigationPolylines", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useNavigationStore.setState({
      endLocation: {
        latitude: 45.501,
        longitude: -73.577,
        name: "EV Building",
        code: "SGW",
      } as any,
      transitMode: TransitMode.transit,
      currentDirections: undefined,
    });

    mockDecode.mockImplementation(() => [
      [45.49, -73.57],
      [45.5, -73.58],
    ]);
  });

  test("renders nothing when directions data is unavailable", () => {
    const { queryByTestId } = render(<NavigationPolylines />);

    expect(queryByTestId("polyline")).toBeNull();
    expect(queryByTestId("marker")).toBeNull();
  });

  test("renders polylines with decoded coordinates and step styling", () => {
    useNavigationStore.setState({
      currentDirections: {
        durationBlock: { type: "duration", durations: {} },
        directionBlocks: [
          {
            type: "outdoor",
            directionsByMode: {
              transit: {
                mode: "transit",
                duration: "12 min",
                distance: "1.4 km",
                departure_message: "Depart now",
                polyline: "route-polyline",
                steps: [
                  {
                    instruction: "Step 1",
                    distance: "0.2 km",
                    duration: "2 min",
                    start: { latitude: 45.49, longitude: -73.57 },
                    end: { latitude: 45.5, longitude: -73.58 },
                    polyline: "transit-polyline",
                    travel_mode: TransitMode.transit,
                    transit_line_color: "#00ff00",
                  },
                  {
                    instruction: "Step 2",
                    distance: "0.2 km",
                    duration: "2 min",
                    start: { latitude: 45.49, longitude: -73.57 },
                    end: { latitude: 45.5, longitude: -73.58 },
                    polyline: "walking-polyline",
                    travel_mode: TransitMode.walking,
                  },
                ],
              },
            },
          },
        ],
      } as any,
    });

    const { getAllByTestId } = render(<NavigationPolylines />);

    expect(mockDecode).toHaveBeenCalledTimes(2);
    const polylines = getAllByTestId("polyline");
    expect(polylines).toHaveLength(2);

    expect(polylines[0].props.strokeColor).toBe("#00ff00");
    expect(polylines[0].props.strokeWidth).toBe(
      directionPolylineStyles.transit.strokeWidth,
    );

    expect(polylines[1].props.strokeColor).toBe(
      directionPolylineStyles.walking.strokeColor,
    );
  });

  test("uses fallback transit color and renders endpoint marker", () => {
    useNavigationStore.setState({
      currentDirections: {
        durationBlock: { type: "duration", durations: {} },
        directionBlocks: [
          {
            type: "outdoor",
            directionsByMode: {
              transit: {
                mode: "transit",
                duration: "12 min",
                distance: "1.4 km",
                departure_message: "Depart now",
                polyline: "route-polyline",
                steps: [
                  {
                    instruction: "Step 1",
                    distance: "0.2 km",
                    duration: "2 min",
                    start: { latitude: 45.49, longitude: -73.57 },
                    end: { latitude: 45.5, longitude: -73.58 },
                    polyline: "transit-no-color",
                    travel_mode: TransitMode.transit,
                  },
                ],
              },
            },
          },
        ],
      } as any,
    });

    const { getByTestId } = render(<NavigationPolylines showEndPoint />);

    expect(getByTestId("polyline").props.strokeColor).toBe(
      DIRECTION_COLORS.transit,
    );
    expect(getByTestId("marker").props.coordinate).toEqual({
      latitude: 45.501,
      longitude: -73.577,
    });
  });

  test("handles missing step polyline by rendering empty coordinates", () => {
    useNavigationStore.setState({
      currentDirections: {
        durationBlock: { type: "duration", durations: {} },
        directionBlocks: [
          {
            type: "outdoor",
            directionsByMode: {
              transit: {
                mode: "transit",
                duration: "12 min",
                distance: "1.4 km",
                departure_message: "Depart now",
                polyline: "route-polyline",
                steps: [
                  {
                    instruction: "Step 1",
                    distance: "0.2 km",
                    duration: "2 min",
                    start: { latitude: 45.49, longitude: -73.57 },
                    end: { latitude: 45.5, longitude: -73.58 },
                    travel_mode: TransitMode.walking,
                  },
                ],
              },
            },
          },
        ],
      } as any,
    });

    const { getByTestId } = render(<NavigationPolylines />);

    expect(mockDecode).not.toHaveBeenCalled();
    expect(getByTestId("polyline").props.coordinates).toEqual([]);
  });
});
