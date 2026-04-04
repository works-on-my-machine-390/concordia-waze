import {
  act,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import * as ExpoRouter from "expo-router";
import * as Location from "expo-location";
import MainMap from "../app/(drawer)/map";
import { getDistance } from "../app/utils/mapUtils";
import { MapMode, useMapStore } from "../hooks/useMapStore";
import { NavigationPhase, useNavigationStore } from "../hooks/useNavigationStore";
import { renderWithProviders } from "../test_utils/renderUtils";

const mockStartTaskTimer = jest.fn();
const mockEndTaskTimer = jest.fn();

jest.mock("@/lib/telemetry", () => ({
  startTaskTimer: (...args: any[]) => mockStartTaskTimer(...args),
  endTaskTimer: (...args: any[]) => mockEndTaskTimer(...args),
}));

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  Accuracy: { High: 6 },
}));

jest.mock("../app/utils/pointInPolygon", () => ({
  isPointInPolygon: jest.fn(() => false),
}));

jest.mock("../app/utils/mapUtils", () => ({
  getDistance: jest.fn(),
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

type CampusBuildingPolygonsProps = {
  buildings?: Array<{ code: string; polygon: number[][] }>;
};

const mockCampusBuildingPolygons = jest.fn(
  (props: CampusBuildingPolygonsProps) => null,
);

jest.mock("~/components/CampusBuildingPolygons", () => ({
  __esModule: true,
  default: (props: CampusBuildingPolygonsProps) => {
    mockCampusBuildingPolygons(props);
    return null;
  },
}));

let latestCampus: string | undefined;

jest.mock("~/components/MapHeader", () => ({
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

let capturedStartLocationPress: (() => void) | undefined;
let capturedEndLocationPress: (() => void) | undefined;

jest.mock("~/components/NavigationHeader", () => ({
  NavigationHeader: ({ onStartLocationPress, onEndLocationPress }: any) => {
    capturedStartLocationPress = onStartLocationPress;
    capturedEndLocationPress = onEndLocationPress;
    const { View, Button, Text } = require("react-native");
    return (
      <View>
        <Text>Navigation Header</Text>
        <Button title="Edit Start" onPress={onStartLocationPress} />
        <Button title="Edit End" onPress={onEndLocationPress} />
      </View>
    );
  },
}));

let capturedGoToMyLocation: (() => void) | undefined;

jest.mock("@/components/MapBottomSection", () => {
  return ({ goToMyLocation }: any) => {
    const { useMapCamera } = require("@/contexts/MapCameraContext");
    const { moveCamera } = useMapCamera();
    capturedGoToMyLocation = goToMyLocation;
    const { View, Button } = require("react-native");
    return (
      <View>
        <Button title="My Location" onPress={goToMyLocation} />
        <Button
          title="Context Move Camera"
          onPress={() => moveCamera({ latitude: 45.499, longitude: -73.58 })}
        />
      </View>
    );
  };
});

const mockAnimateToRegion = jest.fn();
let latestMapProps: any;

jest.mock("react-native-maps", () => {
  const React = require("react");
  const { View } = require("react-native");
  const Marker = (props: any) => <View testID="marker">{props.children}</View>;
  const Polyline = (props: any) => (
    <View testID="polyline">{props.children}</View>
  );

  return {
    __esModule: true,
    default: React.forwardRef((props: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        animateToRegion: mockAnimateToRegion,
      }));
      latestMapProps = props;
      return <View testID="map">{props.children}</View>;
    }),
    Marker,
    Polyline,
  };
});

jest.mock("toastify-react-native", () => ({
  Toast: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
  },
}));

function resetStores() {
  useMapStore.setState({
    userLocation: undefined,
    selectedBuildingCode: undefined,
    currentBuildingCode: undefined,
    currentMode: MapMode.NONE,
  });
  useNavigationStore.setState({
    startLocation: undefined,
    endLocation: undefined,
  });
}

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
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    setParams: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockEndTaskTimer.mockResolvedValue(1000);
    latestCampus = undefined;
    latestMapProps = undefined;
    capturedGoToMyLocation = undefined;
    capturedStartLocationPress = undefined;
    capturedEndLocationPress = undefined;
    resetStores();

    jest.spyOn(ExpoRouter, "useRouter").mockReturnValue(mockRouter as any);
    jest.spyOn(ExpoRouter, "useLocalSearchParams").mockReturnValue({} as any);

    mockUseGetBuildings.mockReturnValue({
      data: {
        campus: "SGW",
        buildings: [
          {
            code: "H",
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

    renderWithProviders(<MainMap />);

    await waitFor(() => {
      expect(Location.watchPositionAsync).toHaveBeenCalled();
    });
  });

  test("does not watch position if permission is denied", async () => {
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

  test("goToMyLocation animates map to watched location", async () => {
    mockGrantedWatchLocation(45.5, -73.6);

    const { getByText } = renderWithProviders(<MainMap />);

    await waitFor(() => {
      expect(capturedGoToMyLocation).toBeDefined();
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

  test("goToMyLocation fetches current position when location is null", async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock)
      .mockResolvedValueOnce({ status: "denied" })
      .mockResolvedValueOnce({ status: "granted" });

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

  test("MapCameraProvider exposes moveCamera to descendants", async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue(
      {
        status: "denied",
      },
    );

    const { getByText } = renderWithProviders(<MainMap />);

    await act(async () => {
      fireEvent.press(getByText("Context Move Camera"));
    });

    expect(mockAnimateToRegion).toHaveBeenCalledWith(
      {
        latitude: 45.499,
        longitude: -73.58,
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

  test("sets currentBuildingCode when user location is inside a building polygon", async () => {
    const { isPointInPolygon } = require("../app/utils/pointInPolygon");
    isPointInPolygon.mockReturnValue(true);

    mockGrantedWatchLocation(45.497, -73.579);

    renderWithProviders(<MainMap />);

    await waitFor(() => {
      expect(isPointInPolygon).toHaveBeenCalled();
      expect(useMapStore.getState().currentBuildingCode).toBe("H");
    });
  });

  test("navigation header edit buttons route to search with edit mode", async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue(
      {
        status: "denied",
      },
    );

    useMapStore.getState().setCurrentMode(MapMode.NAVIGATION);

    renderWithProviders(<MainMap />);

    await waitFor(() => {
      expect(capturedStartLocationPress).toBeDefined();
      expect(capturedEndLocationPress).toBeDefined();
    });

    await act(async () => {
      capturedStartLocationPress?.();
    });

    await act(async () => {
      capturedEndLocationPress?.();
    });

    expect(capturedStartLocationPress).toBeDefined();
    expect(capturedEndLocationPress).toBeDefined();
  });

  test("starts SGW to LOY telemetry timer when navigation route matches campuses", async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue(
      {
        status: "denied",
      },
    );

    useNavigationStore.setState({
      startLocation: {
        latitude: 45.497,
        longitude: -73.579,
        name: "SGW Start",
        code: "SGW",
      },
      endLocation: {
        latitude: 45.4589,
        longitude: -73.64,
        name: "LOY End",
        code: "LOY",
      },
    });

    useMapStore.getState().setCurrentMode(MapMode.NAVIGATION);

    // For start location: SGW closer than LOY. For end location: LOY closer than SGW.
    (getDistance as jest.Mock)
      .mockReturnValueOnce(1)
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(1);

    renderWithProviders(<MainMap />);

    await waitFor(() => {
      expect(mockStartTaskTimer).toHaveBeenCalledWith("sgw_to_loyola_travel");
    });
  });

  test("ends SGW to LOY telemetry timer on arrival to Loyola region during navigation", async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue(
      {
        status: "denied",
      },
    );

    useNavigationStore.setState({
      startLocation: {
        latitude: 45.497,
        longitude: -73.579,
        name: "SGW Start",
        code: "SGW",
      },
      endLocation: {
        latitude: 45.4589,
        longitude: -73.64,
        name: "LOY End",
        code: "LOY",
      },
      transitMode: "TRANSIT" as any,
    });

    useMapStore.getState().setCurrentMode(MapMode.NAVIGATION);

    (getDistance as jest.Mock)
      // Initial route check (start then end)
      .mockReturnValueOnce(1)
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(1)
      // Region change campus check -> LOY
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(1);

    renderWithProviders(<MainMap />);

    await waitFor(() => {
      expect(mockStartTaskTimer).toHaveBeenCalledWith("sgw_to_loyola_travel");
    });

    await act(async () => {
      latestMapProps.onRegionChangeComplete({
        latitude: 45.4589,
        longitude: -73.64,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    });

    await waitFor(() => {
      expect(mockEndTaskTimer).toHaveBeenCalledWith("sgw_to_loyola_travel", {
        success: true,
        reason: "arrived_loyola",
        mode: "TRANSIT",
      });
    });
  });

  test("updates current outdoor step to the closest step start point when within threshold", async () => {
    mockGrantedWatchLocation(45.497, -73.579);

    useMapStore.getState().setCurrentMode(MapMode.NAVIGATION);

    useNavigationStore.setState({
      navigationPhase: NavigationPhase.ACTIVE,
      transitMode: "walking" as any,
      currentOutdoorStepIndex: 0,
      endLocation: {
        latitude: 45.4972,
        longitude: -73.5788,
        name: "Destination",
      },
      currentDirections: {
        directionBlocks: [
          {
            type: "outdoor",
            directionsByMode: {
              walking: {
                steps: [
                  {
                    start: { latitude: 45.5, longitude: -73.6 },
                    end: { latitude: 45.5001, longitude: -73.6001 },
                    instruction: "step 1",
                    distance: "10m",
                    duration: "1m",
                    travel_mode: "walking",
                    polyline: "",
                  },
                  {
                    start: { latitude: 45.497, longitude: -73.579 },
                    end: { latitude: 45.4971, longitude: -73.5789 },
                    instruction: "step 2",
                    distance: "10m",
                    duration: "1m",
                    travel_mode: "walking",
                    polyline: "",
                  },
                ],
              },
            },
          },
        ],
      } as any,
    });

    (getDistance as jest.Mock).mockImplementation(
      (
        point1: { latitude: number; longitude: number },
        point2: { latitude: number; longitude: number },
      ) => {
        if (point2.latitude === 45.497 && point2.longitude === -73.579) {
          return 0.01;
        }
        if (point2.latitude === 45.5 && point2.longitude === -73.6) {
          return 0.2;
        }
        return 1;
      },
    );

    renderWithProviders(<MainMap />);

    await waitFor(() => {
      expect(useNavigationStore.getState().currentOutdoorStepIndex).toBe(1);
    });
  });

  test("does not update current outdoor step when closest step start is outside threshold", async () => {
    mockGrantedWatchLocation(45.497, -73.579);

    useMapStore.getState().setCurrentMode(MapMode.NAVIGATION);

    useNavigationStore.setState({
      navigationPhase: NavigationPhase.ACTIVE,
      transitMode: "walking" as any,
      currentOutdoorStepIndex: 0,
      endLocation: {
        latitude: 45.4972,
        longitude: -73.5788,
        name: "Destination",
      },
      currentDirections: {
        directionBlocks: [
          {
            type: "outdoor",
            directionsByMode: {
              walking: {
                steps: [
                  {
                    start: { latitude: 45.5, longitude: -73.6 },
                    end: { latitude: 45.5001, longitude: -73.6001 },
                    instruction: "step 1",
                    distance: "10m",
                    duration: "1m",
                    travel_mode: "walking",
                    polyline: "",
                  },
                  {
                    start: { latitude: 45.497, longitude: -73.579 },
                    end: { latitude: 45.4971, longitude: -73.5789 },
                    instruction: "step 2",
                    distance: "10m",
                    duration: "1m",
                    travel_mode: "walking",
                    polyline: "",
                  },
                ],
              },
            },
          },
        ],
      } as any,
    });

    (getDistance as jest.Mock).mockImplementation(
      (
        point1: { latitude: number; longitude: number },
        point2: { latitude: number; longitude: number },
      ) => {
        if (point2.latitude === 45.497 && point2.longitude === -73.579) {
          return 0.2;
        }
        if (point2.latitude === 45.5 && point2.longitude === -73.6) {
          return 0.1;
        }
        return 1;
      },
    );

    renderWithProviders(<MainMap />);

    await waitFor(() => {
      expect(Location.watchPositionAsync).toHaveBeenCalled();
    });

    expect(useNavigationStore.getState().currentOutdoorStepIndex).toBe(0);
  });
});
