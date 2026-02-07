/**
 * Tests for Map screen
 */

import { render, fireEvent, waitFor } from "@testing-library/react-native";
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

// Mock expo-location
jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

// Mock building data (keep deterministic + tiny)
jest.mock("../app/utils/campusBuildings", () => ({
  CAMPUS_BUILDINGS: {
    SGW: [
      {
        code: "MB",
        shape: { type: "Polygon", coordinates: [[[0, 0]]] }, // dummy coords
      },
    ],
    LOY: [
      {
        code: "SP",
        shape: { type: "Polygon", coordinates: [[[0, 0]]] }, // dummy coords
      },
    ],
  },
}));

// Mock polygon mapper (we don't test real geometry here)
jest.mock("../app/utils/polygonMapper", () => ({
  polygonToMapCoords: jest.fn(() => [
    { latitude: 0, longitude: 0 },
    { latitude: 0, longitude: 1 },
    { latitude: 1, longitude: 1 },
  ]),
}));

// Mock point-in-polygon (we only need predictable true/false)
jest.mock("../app/utils/pointInPolygon", () => ({
  isPointInPolygon: jest.fn(() => true), // always inside for this suite
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

  // Fake MapView supports refs and exposes animateToRegion
  const MockMapView = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      animateToRegion: mockAnimateToRegion,
    }));

    return <View testID="map">{props.children}</View>;
  });

  const MockMarker = (props: any) => <View testID="marker" />;

  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
  };
});

describe("MainMap screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {}); // Mock console.error
  });

  test("requests location permission on mount", async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "granted",
    });

    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: { latitude: 45.5, longitude: -73.6 },
    });

    render(<MainMap />);

    await waitFor(() => {
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
    });
  });

  test("fetches current position when permission is granted", async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "granted",
    });

    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: { latitude: 45.5, longitude: -73.6 },
    });

    render(<MainMap />);

    await waitFor(() => {
      expect(Location.getCurrentPositionAsync).toHaveBeenCalled();
    });
  });

  test("does NOT fetch position if permission is denied", async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "denied",
    });

    render(<MainMap />);

    await waitFor(() => {
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
    });

    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  test("renders a Marker when location is available", async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "granted",
    });

    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: { latitude: 45.5, longitude: -73.6 },
    });

    const { findByTestId } = render(<MainMap />);

    // marker should appear after location is set
    expect(await findByTestId("marker")).toBeTruthy();
  });

  test("pressing LocationButton animates map to current location (when location already exists)", async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "granted",
    });

    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: { latitude: 45.5, longitude: -73.6 },
    });

    const { getByText } = render(<MainMap />);

    // Wait until location is loaded from useEffect
    await waitFor(() => {
      expect(Location.getCurrentPositionAsync).toHaveBeenCalled();
    });

    fireEvent.press(getByText("My Location"));

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

  test("pressing LocationButton requests permission and gets location if location is missing", async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "granted",
    });

    // For mount: make it fail so location remains null
    (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValueOnce(
      new Error("no location on mount"),
    );

    // For button press: return valid location
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValueOnce({
      coords: { latitude: 45.51, longitude: -73.61 },
    });

    const { getByText } = render(<MainMap />);

    fireEvent.press(getByText("My Location"));

    await waitFor(() => {
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
      expect(Location.getCurrentPositionAsync).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockAnimateToRegion).toHaveBeenCalledWith(
        {
          latitude: 45.51,
          longitude: -73.61,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        500,
      );
    });
  });

  test("changing campus animates map to Loyola coords", async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "denied",
    });

    const { getByText } = render(<MainMap />);

    fireEvent.press(getByText("Switch to Loyola"));

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
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "granted",
    });

    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: { latitude: 45.5, longitude: -73.6 },
    });

    render(<MainMap />);

    // Wait for mount location effect
    await waitFor(() => {
      expect(Location.getCurrentPositionAsync).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockCampusBuildingPolygons).toHaveBeenCalled();

      const lastCallProps = mockCampusBuildingPolygons.mock.calls.at(-1)?.[0] as
        | CampusBuildingPolygonsProps
        | undefined;

      expect(lastCallProps?.highlightedCode).toBe("MB");
      expect(lastCallProps?.campus).toBe("SGW");
    });
  });

  test("shows error if goToMyLocation throws", async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "granted",
    });

    // mount works
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValueOnce({
      coords: { latitude: 45.5, longitude: -73.6 },
    });

    const { getByText } = render(<MainMap />);

    // Make permission request throw on button press (forces catch path)
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockRejectedValueOnce(
      new Error("permission request failed"),
    );

    fireEvent.press(getByText("My Location"));

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith("Failed to get to your location.");
    });
  });
});
