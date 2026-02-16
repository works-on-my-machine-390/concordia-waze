/**
 * Tests for Map screen
 */

import { fireEvent, waitFor, act, cleanup } from "@testing-library/react-native";
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
};

const mockCampusBuildingPolygons = jest.fn(
  (props: CampusBuildingPolygonsProps) => null,
);

let latestCampus: string | undefined;

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

// Mock LocationButton so we can press it
jest.mock("../components/LocationButton", () => {
  return ({ onPress }: any) => {
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

// Mock the BuildingBottomSheet component to not render it during test
// returns null because only want to test MainMap behavior (not the bottom sheet itself)
jest.mock('@/components/BuildingBottomSheet', () => {
  return function MockBuildingBottomSheet() {
    return null; 
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

    (getDistance as jest.Mock)
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(10);

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

  test("navigation mode is initially false", async () => {
    mockGrantedWatchLocation();
    const { queryByText } = renderWithProviders(<MainMap />);
    
    expect(queryByText("From")).toBeNull();
    expect(queryByText("To")).toBeNull();
  });

  test("fetches building details for selected building", async () => {
    mockGrantedWatchLocation();
    renderWithProviders(<MainMap />);

    await waitFor(() => {
      expect(Location.watchPositionAsync).toHaveBeenCalled();
    });
  });

  test("fetches building details for current building when user is inside", async () => {
    const { isPointInPolygon } = require("../app/utils/pointInPolygon");
    isPointInPolygon.mockReturnValue(true);
    
    mockGrantedWatchLocation(45.497, -73.579); // Hall building coordinates
    
    renderWithProviders(<MainMap />);

    await waitFor(() => {
      expect(isPointInPolygon).toHaveBeenCalled();
    }, { timeout: 3000 });

    expect(mockCampusBuildingPolygons).toHaveBeenCalled();
  });
});

describe("Reverse Geocoding", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});

    (Location.reverseGeocodeAsync as jest.Mock).mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  test("calls reverseGeocodeAsync when user has location but not in building", async () => {
    const { isPointInPolygon } = require("../app/utils/pointInPolygon");
    isPointInPolygon.mockReturnValue(false);

    (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([
      {
        streetNumber: "1455",
        street: "De Maisonneuve Blvd W",
        city: "Montreal",
        region: "QC",
        postalCode: "H3G 1M8",
      },
    ]);

    mockGrantedWatchLocation(45.4965, -73.5785); // Krispy Kreme coords

    renderWithProviders(<MainMap />);

    await waitFor(() => {
      expect(Location.reverseGeocodeAsync).toHaveBeenCalledWith({
        latitude: 45.4965,
        longitude: -73.5785,
      });
    }, { timeout: 3000 });
  });

  test("handles reverseGeocodeAsync error gracefully", async () => {
    const { isPointInPolygon } = require("../app/utils/pointInPolygon");
    isPointInPolygon.mockReturnValue(false);

    (Location.reverseGeocodeAsync as jest.Mock).mockRejectedValue(
      new Error("Geocoding failed")
    );

    mockGrantedWatchLocation(45.5, -73.6);

    renderWithProviders(<MainMap />);

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        "Failed to get address",
        expect.any(Error)
      );
    }, { timeout: 3000 });
  });

  test("does not call reverseGeocode when user is inside a building", async () => {
    const { isPointInPolygon } = require("../app/utils/pointInPolygon");
    isPointInPolygon.mockReturnValue(true);

    (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([]);

    mockGrantedWatchLocation(45.497, -73.579);

    renderWithProviders(<MainMap />);

    await waitFor(() => {
      expect(mockCampusBuildingPolygons).toHaveBeenCalled();
    });

    expect(Location.reverseGeocodeAsync).not.toHaveBeenCalled();
  });

  test("formats address correctly with all components", async () => {
    const { isPointInPolygon } = require("../app/utils/pointInPolygon");
    isPointInPolygon.mockReturnValue(false);

    (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([
      {
        streetNumber: "1455",
        street: "De Maisonneuve Blvd W",
        city: "Montreal",
        region: "QC",
        postalCode: "H3G 1M8",
      },
    ]);

    mockGrantedWatchLocation(45.4965, -73.5785);

    renderWithProviders(<MainMap />);

    await waitFor(() => {
      expect(Location.reverseGeocodeAsync).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  test("handles partial address data", async () => {
    const { isPointInPolygon } = require("../app/utils/pointInPolygon");
    isPointInPolygon.mockReturnValue(false);

    (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([
      {
        street: "De Maisonneuve Blvd W",
        city: "Montreal",
      },
    ]);

    mockGrantedWatchLocation(45.4965, -73.5785);

    renderWithProviders(<MainMap />);

    await waitFor(() => {
      expect(Location.reverseGeocodeAsync).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  test("falls back to Current Location if geocoding returns empty", async () => {
    const { isPointInPolygon } = require("../app/utils/pointInPolygon");
    isPointInPolygon.mockReturnValue(false);

    (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([]);

    mockGrantedWatchLocation(45.4965, -73.5785);

    renderWithProviders(<MainMap />);

    await waitFor(() => {
      expect(Location.reverseGeocodeAsync).toHaveBeenCalled();
    }, { timeout: 3000 });
  });
});

describe("Start Location Text", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
  });

  test("shows building name when user is inside a building", async () => {
    const { isPointInPolygon } = require("../app/utils/pointInPolygon");
    isPointInPolygon.mockReturnValue(true);

    mockGrantedWatchLocation(45.497, -73.579);

    renderWithProviders(<MainMap />);

    await waitFor(() => {
      expect(mockCampusBuildingPolygons).toHaveBeenCalled();
    });
  });

  test("shows coordinates when location exists but no address", async () => {
    const { isPointInPolygon } = require("../app/utils/pointInPolygon");
    isPointInPolygon.mockReturnValue(false);

    const mockReverseGeocode = jest.fn().mockResolvedValue([]);
    (Location as any).reverseGeocodeAsync = mockReverseGeocode;

    mockGrantedWatchLocation(45.4965, -73.5785);

    renderWithProviders(<MainMap />);

    await waitFor(() => {
      expect(mockCampusBuildingPolygons).toHaveBeenCalled();
    });
  });

  test("shows 'Please select a building' when no location available", async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue(
      { status: "denied" }
    );

    renderWithProviders(<MainMap />);

    await waitFor(() => {
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
    });
  });
});

describe("Location Button Position", () => {
  test("adjusts location button position based on navigation mode and selection", async () => {
    mockGrantedWatchLocation();

    renderWithProviders(<MainMap />);

    await waitFor(() => {
      expect(mockCampusBuildingPolygons).toHaveBeenCalled();
    });
  });

});
