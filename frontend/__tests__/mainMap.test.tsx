/**
 * Tests for Map screen
 */

import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { Alert } from "react-native";

import MainMap from "../app/map";
import * as Location from "expo-location";

/**
 * -----------------------------
 * Mocks
 * -----------------------------
 */

// Mock Alert
jest.spyOn(Alert, "alert").mockImplementation(() => {});

// Mock expo-location (MainMap uses watchPositionAsync)
jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  Accuracy: { High: 6 },
}));

// Mock building data (use a VALID polygon ring: 4 points + closed)
jest.mock("../app/utils/campusBuildings", () => ({
  CAMPUS_BUILDINGS: {
    SGW: [
      {
        code: "MB",
        shape: {
          type: "Polygon",
          coordinates: [
            [
              [-73.61, 45.49],
              [-73.59, 45.49],
              [-73.59, 45.51],
              [-73.61, 45.51],
              [-73.61, 45.49], // closed ring
            ],
          ],
        },
      },
    ],
    LOY: [
      {
        code: "SP",
        shape: {
          type: "Polygon",
          coordinates: [
            [
              [-73.65, 45.45],
              [-73.63, 45.45],
              [-73.63, 45.47],
              [-73.65, 45.47],
              [-73.65, 45.45],
            ],
          ],
        },
      },
    ],
  },
}));

// Mock polygon mapper (convert [lng,lat] to {latitude,longitude})
jest.mock("../app/utils/polygonMapper", () => ({
  polygonToMapCoords: jest.fn((polygon: any) => {
    const ring = polygon?.coordinates?.[0] ?? [];
    return ring.map(([lng, lat]: [number, number]) => ({
      latitude: lat,
      longitude: lng,
    }));
  }),
}));

// Mock point-in-polygon (predictable true)
jest.mock("../app/utils/pointInPolygon", () => ({
  isPointInPolygon: jest.fn(() => true),
}));

/**
 * CampusBuildingPolygons mock (TS-safe)
 */
type CampusBuildingPolygonsProps = {
  highlightedCode?: string | null;
  campus?: string;
};

const mockCampusBuildingPolygons = jest.fn(
  (props: CampusBuildingPolygonsProps) => null,
);

// IMPORTANT:
// This mock assumes MainMap imports CampusBuildingPolygons as DEFAULT:
//   import CampusBuildingPolygons from "../components/CampusBuildingPolygons"
jest.mock("../components/CampusBuildingPolygons", () => {
  return {
    __esModule: true,
    default: (props: CampusBuildingPolygonsProps) => {
      mockCampusBuildingPolygons(props);
      return null;
    },
  };
});

// Mock MapHeader so we can trigger onCampusChange easily
jest.mock("../components/MapHeader", () => ({
  MapHeader: ({ onCampusChange }: any) => {
    const React = require("react");
    const { View, Button } = require("react-native");
    return (
      <View>
        <Button
          title="Switch to Loyola"
          onPress={() => onCampusChange("Loyola")}
        />
        <Button title="Switch to SGW" onPress={() => onCampusChange("SGW")} />
      </View>
    );
  },
}));

// Mock LocationButton so we can press it
jest.mock("../components/LocationButton", () => {
  return ({ onPress }: any) => {
    const React = require("react");
    const { Button } = require("react-native");
    return <Button title="My Location" onPress={onPress} />;
  };
});

// Mock react-native-maps so we can control mapRef + animateToRegion
const mockAnimateToRegion = jest.fn();

jest.mock("react-native-maps", () => {
  const React = require("react");
  const { View } = require("react-native");

  const MockMapView = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      animateToRegion: mockAnimateToRegion,
    }));

    return <View testID="map">{props.children}</View>;
  });

  const MockMarker = () => <View testID="marker" />;

  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
  };
});

/**
 * Helper: permission granted + watch emits a location update immediately
 */
function mockGrantedWatchLocation(lat = 45.5, lng = -73.6) {
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
    status: "granted",
  });

  (Location.watchPositionAsync as jest.Mock).mockImplementation(
    async (_opts: any, onUpdate: any) => {
      onUpdate({ coords: { latitude: lat, longitude: lng } });
      return { remove: jest.fn() };
    },
  );
}

describe("MainMap screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  test("requests location permission on mount", async () => {
    mockGrantedWatchLocation();

    render(<MainMap />);

    await waitFor(() => {
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
    });
  });

  test("starts watching position when permission is granted", async () => {
    mockGrantedWatchLocation();

    render(<MainMap />);

    await waitFor(() => {
      expect(Location.watchPositionAsync).toHaveBeenCalled();
    });
  });

  test("does NOT watch position if permission is denied", async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "denied",
    });

    render(<MainMap />);

    await waitFor(() => {
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
    });

    expect(Location.watchPositionAsync).not.toHaveBeenCalled();
  });

  test("renders a Marker when location is available", async () => {
    mockGrantedWatchLocation(45.5, -73.6);

    const { findByTestId } = render(<MainMap />);

    expect(await findByTestId("marker")).toBeTruthy();
  });

  test("pressing LocationButton animates map to current location (when location exists)", async () => {
    mockGrantedWatchLocation(45.5, -73.6);

    const { getByText, findByTestId } = render(<MainMap />);

    await findByTestId("marker");

    await act(async () => {
      fireEvent.press(getByText("My Location"));
    });

    await waitFor(() => {
      expect(mockAnimateToRegion).toHaveBeenCalledWith(
        {
          latitude: 45.5,
          longitude: -73.6,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        500,
      );
    });
  });

  test("pressing LocationButton does not animate if location is missing", async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "denied",
    });

    const { getByText } = render(<MainMap />);

    await act(async () => {
      fireEvent.press(getByText("My Location"));
    });

    // MainMap appears to silently do nothing in this state
    expect(mockAnimateToRegion).not.toHaveBeenCalled();
  });

  test("changing campus animates map to Loyola coords", async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "denied",
    });

    const { getByText } = render(<MainMap />);

    await act(async () => {
      fireEvent.press(getByText("Switch to Loyola"));
    });

    expect(mockAnimateToRegion).toHaveBeenCalledWith(
      {
        latitude: 45.4589,
        longitude: -73.64,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      },
      500,
    );
  });

  test("passes highlightedCode to CampusBuildingPolygons when location updates", async () => {
    mockGrantedWatchLocation(45.5, -73.6);

    render(<MainMap />);

    await waitFor(() => {
      expect(mockCampusBuildingPolygons).toHaveBeenCalled();
    });

    await waitFor(() => {
      const lastProps = mockCampusBuildingPolygons.mock.calls.at(-1)?.[0] as
        | CampusBuildingPolygonsProps
        | undefined;

      expect(lastProps?.highlightedCode).toBe("MB");
      expect(lastProps?.campus).toBe("SGW");
    });
  });

  test("logs error if watchPositionAsync throws", async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "granted",
    });

    (Location.watchPositionAsync as jest.Mock).mockRejectedValueOnce(
      new Error("permission request failed"),
    );

    render(<MainMap />);

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        "Failed to watch location.",
        expect.any(Error),
      );
    });
  });
});
