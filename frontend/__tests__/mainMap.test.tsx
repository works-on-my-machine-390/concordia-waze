/**
 * Tests for Map screen
 */

import {
  fireEvent,
  waitFor,
  act,
  cleanup,
} from "@testing-library/react-native";
import { Alert } from "react-native";
import { renderWithProviders } from "../test_utils/renderUtils";

import MainMap from "../app/(drawer)/map";
import * as Location from "expo-location";
import { getDistance } from "../app/utils/mapUtils";

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
  reverseGeocodeAsync: jest.fn(),
  Accuracy: { High: 6 },
}));

// Mock point-in-polygon (predictable true)
jest.mock("../app/utils/pointInPolygon", () => ({
  isPointInPolygon: jest.fn(() => true),
}));

// Mock distance utility so we can control campus switching
jest.mock("../app/utils/mapUtils", () => ({
  getDistance: jest.fn(),
}));

/**
 * CampusBuildingPolygons mock (TS-safe)
 */
type CampusBuildingPolygonsProps = {
  highlightedCode?: string | null;
  campus?: string;
  selectedCode?: string;
};

const mockCampusBuildingPolygons = jest.fn(
  (props: CampusBuildingPolygonsProps) => null,
);

let latestCampus: string | undefined;
let capturedBottomSheetOnClose: (() => void) | null = null;

let capturedNearbyResultsProps: any = null;

jest.mock("../components/NearbyResultsBottomSheet", () => {
  return function MockNearbyResultsBottomSheet(props: any) {
    capturedNearbyResultsProps = props;
    return null;
  };
});

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
  MapHeader: ({ onCampusChange, campus }: any) => {
    latestCampus = campus;
    const { View, Button } = require("react-native");
    return (
      <View>
        <Button
          title="Switch to Loyola"
          onPress={() => onCampusChange("LOY")}
        />
        <Button title="Switch to SGW" onPress={() => onCampusChange("SGW")} />
      </View>
    );
  },
}));

// Mock LocationButton and capture props
let capturedLocationButtonProps: any = null;

jest.mock("../components/LocationButton", () => {
  return ({ onPress, bottomPosition }: any) => {
    capturedLocationButtonProps = { onPress, bottomPosition };
    const { Button } = require("react-native");
    return <Button title="My Location" onPress={onPress} />;
  };
});

// Mock react-native-maps so we can control mapRef + animateToRegion
const mockAnimateToRegion = jest.fn();
let latestMapProps: any;

jest.mock("react-native-maps", () => {
  const React = require("react");
  const { View } = require("react-native");

  return {
    __esModule: true,
    default: React.forwardRef((props, ref) => {
      React.useImperativeHandle(ref, () => ({
        animateToRegion: mockAnimateToRegion,
      }));
      latestMapProps = props;
      return <View testID="map">{props.children}</View>;
    }),
    Marker: ({ children }) => <View testID="marker">{children}</View>,
  };
});

// Mock the BuildingBottomSheet component
let capturedOnStartNavigation: (() => void) | null = null;

jest.mock("@/components/BuildingBottomSheet", () => {
  return function MockBuildingBottomSheet({
    onClose,
    buildingCode,
    onStartNavigation,
  }: any) {
    capturedBottomSheetOnClose = onClose;
    capturedOnStartNavigation = onStartNavigation;
    const { Button, View } = require("react-native");
    if (!buildingCode) return null;
    return (
      <View>
        <Button title="Close Bottom Sheet" onPress={onClose} />
        <Button title="Start Navigation" onPress={onStartNavigation} />
      </View>
    );
  };
});

// Mock NavigationHeader
jest.mock("../components/NavigationHeader", () => ({
  NavigationHeader: ({ startLocation, endLocation, onCancel }: any) => {
    const { View, Text, Button } = require("react-native");
    return (
      <View>
        <Text>From</Text>
        <Text>{startLocation}</Text>
        <Text>To</Text>
        <Text>{endLocation}</Text>
        <Button title="Cancel Navigation" onPress={onCancel} />
      </View>
    );
  },
}));

// Mock Toast
jest.mock("toastify-react-native", () => ({
  Toast: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
  },
}));

const mockUseGetBuildings = jest.fn();
const mockUseGetBuildingDetails = jest.fn();

jest.mock("@/hooks/queries/buildingQueries", () => ({
  useGetBuildings: () => mockUseGetBuildings(),
  useGetBuildingDetails: (code: string) => mockUseGetBuildingDetails(code),
  CampusCode: {
    SGW: "SGW",
    LOY: "LOY",
  },
}));

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
    latestCampus = undefined;
    latestMapProps = undefined;

    mockUseGetBuildings.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });

    mockUseGetBuildingDetails.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    cleanup();
  });

  test("requests location permission on mount", async () => {
    mockGrantedWatchLocation();

    renderWithProviders(<MainMap />);

    await waitFor(() => {
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
    });
  });

  test("starts watching position when permission is granted", async () => {
    mockGrantedWatchLocation();

    const { unmount } = renderWithProviders(<MainMap />);

    await waitFor(() => {
      expect(Location.watchPositionAsync).toHaveBeenCalled();
    });
    unmount();
  });

  test("does NOT watch position if permission is denied", async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue(
      {
        status: "denied",
      },
    );

    renderWithProviders(<MainMap />);

    await waitFor(() => {
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
    });

    expect(Location.watchPositionAsync).not.toHaveBeenCalled();
  });

  test("pressing LocationButton animates map to current location (when location exists)", async () => {
    mockGrantedWatchLocation(45.5, -73.6);

    const { getByText } = renderWithProviders(<MainMap />);

    // Wait for location to be set (indicated by CampusBuildingPolygons being called)
    await waitFor(() => {
      expect(mockCampusBuildingPolygons).toHaveBeenCalled();
    });

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
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue(
      {
        status: "denied",
      },
    );

    const { getByText } = renderWithProviders(<MainMap />);

    await act(async () => {
      fireEvent.press(getByText("My Location"));
    });

    // MainMap appears to silently do nothing in this state
    expect(mockAnimateToRegion).not.toHaveBeenCalled();
  });

  test("changing campus animates map to Loyola coords", async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue(
      {
        status: "denied",
      },
    );

    const { getByText } = renderWithProviders(<MainMap />);

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

  test("region change switches campus to the closest campus", async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue(
      {
        status: "denied",
      },
    );

    (getDistance as jest.Mock).mockReturnValueOnce(100).mockReturnValueOnce(10);

    renderWithProviders(<MainMap />);

    await act(async () => {
      latestMapProps.onRegionChangeComplete({
        latitude: 45.46,
        longitude: -73.64,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    });

    await waitFor(() => {
      expect(latestCampus).toBe("LOY");
    });
  });

  test("logs error if watchPositionAsync throws", async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue(
      {
        status: "granted",
      },
    );

    (Location.watchPositionAsync as jest.Mock).mockRejectedValueOnce(
      new Error("permission request failed"),
    );

    renderWithProviders(<MainMap />);

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        "Failed to watch location.",
        expect.any(Error),
      );
    });
  });

  test("calls reverse geocoding and formats address when user has location but not in building", async () => {
    // Mock reverse geocoding to return an address
    (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([
      {
        streetNumber: "1455",
        street: "De Maisonneuve Blvd W",
        city: "Montreal",
        region: "Quebec",
        postalCode: "H3G 1M8",
      },
    ]);

    // Mock point in polygon to return false (user NOT in a building)
    const { isPointInPolygon } = require("../app/utils/pointInPolygon");
    isPointInPolygon.mockReturnValue(false);

    mockGrantedWatchLocation(45.497, -73.579);

    renderWithProviders(<MainMap />);

    // Wait for reverse geocoding to be called
    await waitFor(() => {
      expect(Location.reverseGeocodeAsync).toHaveBeenCalledWith({
        latitude: 45.497,
        longitude: -73.579,
      });
    });

    // Verify the mock was called
    expect(Location.reverseGeocodeAsync).toHaveBeenCalledTimes(1);
  });

  test("handles reverse geocoding error gracefully", async () => {
    // Mock reverse geocoding to throw an error
    (Location.reverseGeocodeAsync as jest.Mock).mockRejectedValue(
      new Error("Network error"),
    );

    // Mock point in polygon to return false (user NOT in a building)
    const { isPointInPolygon } = require("../app/utils/pointInPolygon");
    isPointInPolygon.mockReturnValue(false);

    mockGrantedWatchLocation(45.497, -73.579);

    renderWithProviders(<MainMap />);

    // Wait for reverse geocoding to be called and fail
    await waitFor(() => {
      expect(Location.reverseGeocodeAsync).toHaveBeenCalledWith({
        latitude: 45.497,
        longitude: -73.579,
      });
    });

    // Verify error was logged
    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        "Failed to get address",
        expect.any(Error),
      );
    });
  });

  test("LocationButton has correct bottomPosition when building selected and not in navigation mode", async () => {
    mockGrantedWatchLocation();

    renderWithProviders(<MainMap />);

    await waitFor(() => {
      expect(mockCampusBuildingPolygons).toHaveBeenCalled();
    });

    // at first, no building selected, should be 80
    expect(capturedLocationButtonProps.bottomPosition).toBe(80);

    // select a building
    const lastCall =
      mockCampusBuildingPolygons.mock.calls[
        mockCampusBuildingPolygons.mock.calls.length - 1
      ];
    const onBuildingPress = (lastCall[0] as any).onBuildingPress;

    await act(async () => {
      onBuildingPress("H");
    });

    // building selected but not in navigation mode, should be 220
    await waitFor(() => {
      expect(capturedLocationButtonProps.bottomPosition).toBe(220);
    });
  });

  test("LocationButton has correct bottomPosition when in navigation mode", async () => {
    mockGrantedWatchLocation();

    renderWithProviders(<MainMap />);

    await waitFor(() => {
      expect(mockCampusBuildingPolygons).toHaveBeenCalled();
    });

    const lastCall =
      mockCampusBuildingPolygons.mock.calls[
        mockCampusBuildingPolygons.mock.calls.length - 1
      ];
    const onBuildingPress = (lastCall[0] as any).onBuildingPress;

    await act(async () => {
      onBuildingPress("H");
    });

    await act(async () => {
      if (capturedOnStartNavigation) {
        capturedOnStartNavigation();
      }
    });

    // in navigation mode, should be 150
    await waitFor(() => {
      expect(capturedLocationButtonProps.bottomPosition).toBe(150);
    });
  });

  test("closing BuildingBottomSheet resets selectedBuildingCode and navigation mode", async () => {
    mockGrantedWatchLocation();

    const { queryByText } = renderWithProviders(<MainMap />);

    await waitFor(() => {
      expect(mockCampusBuildingPolygons).toHaveBeenCalled();
    });

    const lastCall =
      mockCampusBuildingPolygons.mock.calls[
        mockCampusBuildingPolygons.mock.calls.length - 1
      ];
    const onBuildingPress = (lastCall[0] as any).onBuildingPress;

    await act(async () => {
      onBuildingPress("H");
    });

    await act(async () => {
      if (capturedOnStartNavigation) {
        capturedOnStartNavigation();
      }
    });

    await waitFor(() => {
      expect(queryByText("Cancel Navigation")).toBeTruthy();
    });

    await act(async () => {
      if (capturedBottomSheetOnClose) {
        capturedBottomSheetOnClose();
      }
    });

    await waitFor(() => {
      expect(queryByText("Cancel Navigation")).toBeNull();
      expect(capturedLocationButtonProps.bottomPosition).toBe(80);
    });
  });

  test("canceling navigation from NavigationHeader resets state", async () => {
    mockGrantedWatchLocation();

    const { getByText, queryByText } = renderWithProviders(<MainMap />);

    await waitFor(() => {
      expect(mockCampusBuildingPolygons).toHaveBeenCalled();
    });

    const lastCall =
      mockCampusBuildingPolygons.mock.calls[
        mockCampusBuildingPolygons.mock.calls.length - 1
      ];
    const onBuildingPress = (lastCall[0] as any).onBuildingPress;

    await act(async () => {
      onBuildingPress("H");
    });

    await act(async () => {
      if (capturedOnStartNavigation) {
        capturedOnStartNavigation();
      }
    });

    await waitFor(() => {
      expect(getByText("Cancel Navigation")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText("Cancel Navigation"));
    });

    await waitFor(() => {
      expect(queryByText("Cancel Navigation")).toBeNull();
      expect(capturedLocationButtonProps.bottomPosition).toBe(80);
    });
  });

  test("sets currentBuildingCode when user location is inside a building polygon", async () => {
    const { isPointInPolygon } = require("../app/utils/pointInPolygon");

    isPointInPolygon.mockClear();

    isPointInPolygon.mockReturnValue(true);

    mockUseGetBuildings.mockReturnValue({
      data: {
        campus: "SGW",
        buildings: [
          {
            code: "H",
            long_name: "Henry F. Hall Building",
            polygon: [
              [45.497, -73.579],
              [45.498, -73.578],
              [45.497, -73.577],
            ],
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    mockGrantedWatchLocation(45.497, -73.579);

    renderWithProviders(<MainMap />);

    await waitFor(
      () => {
        expect(isPointInPolygon).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    await waitFor(() => {
      const calls = mockCampusBuildingPolygons.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0].highlightedCode).toBe("H");
    });
  });

  test("goToMyLocation fetches current position when location is null but permission granted", async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue(
      {
        status: "granted",
      },
    );

    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: { latitude: 45.555, longitude: -73.666 },
    });

    const { getByText } = renderWithProviders(<MainMap />);

    await act(async () => {
      fireEvent.press(getByText("My Location"));
    });

    await waitFor(() => {
      expect(Location.getCurrentPositionAsync).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockAnimateToRegion).toHaveBeenCalledWith(
        {
          latitude: 45.555,
          longitude: -73.666,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        500,
      );
    });
  });

  test("goToMyLocation handles errors and shows toast message", async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue(
      {
        status: "granted",
      },
    );

    (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(
      new Error("GPS signal lost"),
    );

    const { Toast } = require("toastify-react-native");

    const { getByText } = renderWithProviders(<MainMap />);

    await act(async () => {
      fireEvent.press(getByText("My Location"));
    });

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        "Failed to get to your location.",
        expect.any(Error),
      );
    });

    await waitFor(() => {
      expect(Toast.error).toHaveBeenCalledWith(
        "Failed to get your location. Please try again.",
      );
    });
  });

  test("handleStartNavigation shows warning when location is not available", async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue(
      {
        status: "denied",
      },
    );

    const { Toast } = require("toastify-react-native");

    renderWithProviders(<MainMap />);

    await waitFor(() => {
      expect(mockCampusBuildingPolygons).toHaveBeenCalled();
    });

    const lastCall =
      mockCampusBuildingPolygons.mock.calls[
        mockCampusBuildingPolygons.mock.calls.length - 1
      ];
    const onBuildingPress = (lastCall[0] as any).onBuildingPress;

    await act(async () => {
      onBuildingPress("H");
    });

    await act(async () => {
      if (capturedOnStartNavigation) {
        capturedOnStartNavigation();
      }
    });

    await waitFor(() => {
      expect(Toast.warn).toHaveBeenCalledWith(
        "Location access was denied. Please select a start building.",
        "top",
      );
    });
  });

  test("startLocationText shows building code and name when user is in a building", async () => {
    const { isPointInPolygon } = require("../app/utils/pointInPolygon");
    isPointInPolygon.mockReturnValue(true);

    mockUseGetBuildings.mockReturnValue({
      data: {
        campus: "SGW",
        buildings: [
          {
            code: "H",
            long_name: "Henry F. Hall Building",
            polygon: [
              [45.497, -73.579],
              [45.498, -73.578],
              [45.497, -73.577],
            ],
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    mockUseGetBuildingDetails.mockImplementation((code) => {
      if (code === "H") {
        return {
          data: {
            code: "H",
            long_name: "Henry F. Hall Building",
          },
          isLoading: false,
          error: null,
        };
      }
      return {
        data: null,
        isLoading: false,
        error: null,
      };
    });

    mockGrantedWatchLocation(45.497, -73.579);

    const { getByText } = renderWithProviders(<MainMap />);

    await waitFor(() => {
      expect(isPointInPolygon).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockCampusBuildingPolygons).toHaveBeenCalled();
    });

    const lastCall =
      mockCampusBuildingPolygons.mock.calls[
        mockCampusBuildingPolygons.mock.calls.length - 1
      ];
    const onBuildingPress = (lastCall[0] as any).onBuildingPress;

    await act(async () => {
      onBuildingPress("MB");
    });

    await act(async () => {
      if (capturedOnStartNavigation) {
        capturedOnStartNavigation();
      }
    });

    await waitFor(() => {
      expect(getByText("H - Henry F. Hall Building")).toBeTruthy();
    });
  });

  test("initializes with campus parameter from URL and animates to coords", async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue(
      {
        status: "denied",
      },
    );

    // Mock useLocalSearchParams to return campus
    jest.spyOn(require("expo-router"), "useLocalSearchParams").mockReturnValue({
      campus: "LOY",
    });

    renderWithProviders(<MainMap />);

    await waitFor(() => {
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

    await waitFor(() => {
      expect(latestCampus).toBe("LOY");
    });
  });

  test("displays building details in NavigationHeader when navigation starts", async () => {
    mockGrantedWatchLocation(45.497, -73.579);

    mockUseGetBuildingDetails.mockImplementation((code) => {
      if (code === "H") {
        return {
          data: {
            code: "H",
            long_name: "Henry F. Hall Building",
            address: "1455 De Maisonneuve Blvd W",
            latitude: 45.497,
            longitude: -73.579,
          },
          isLoading: false,
          error: null,
        };
      }
      return {
        data: null,
        isLoading: false,
        error: null,
      };
    });

    mockUseGetBuildings.mockReturnValue({
      data: {
        campus: "SGW",
        buildings: [
          {
            code: "H",
            long_name: "Henry F. Hall Building",
            polygon: [
              [45.497, -73.579],
              [45.498, -73.578],
              [45.497, -73.577],
            ],
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    const { getAllByText } = renderWithProviders(<MainMap />);

    await waitFor(() => {
      expect(mockCampusBuildingPolygons).toHaveBeenCalled();
    });

    const lastCall =
      mockCampusBuildingPolygons.mock.calls[
        mockCampusBuildingPolygons.mock.calls.length - 1
      ];
    const onBuildingPress = (lastCall[0] as any).onBuildingPress;

    await act(async () => {
      onBuildingPress("H");
    });

    await act(async () => {
      if (capturedOnStartNavigation) {
        capturedOnStartNavigation();
      }
    });

    await waitFor(() => {
      const elements = getAllByText("H - Henry F. Hall Building");
      expect(elements.length).toBeGreaterThan(0);
    });
  });
});
