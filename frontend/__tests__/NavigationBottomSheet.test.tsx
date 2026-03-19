import { getIsCrossCampus } from "@/app/utils/mapUtils";
import {
  TransitMode,
  useGetDirections,
} from "@/hooks/queries/navigationQueries";
import { MapMode, useMapStore } from "@/hooks/useMapStore";
import { useNavigationStore } from "@/hooks/useNavigationStore";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import NavigationBottomSheet from "../components/NavigationBottomSheet";

jest.mock("@/app/utils/mapUtils", () => ({
  getIsCrossCampus: jest.fn(),
}));

jest.mock("@/hooks/queries/navigationQueries", () => ({
  TransitMode: {
    driving: "driving",
    transit: "transit",
    walking: "walking",
    bicycling: "bicycling",
    shuttle: "shuttle",
  },
  DirectionsResponseBlockType: {
    OUTDOOR: "outdoor",
    INDOOR: "indoor",
    DURATION: "duration",
  },
  useGetDirections: jest.fn(),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("react-native-gesture-handler", () => {
  const { View } = require("react-native");
  return {
    ScrollView: ({ children }: any) => <View>{children}</View>,
  };
});

jest.mock("@gorhom/bottom-sheet", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: React.forwardRef(({ children }: any, _ref: any) => (
      <View testID="navigation-bottom-sheet">{children}</View>
    )),
    BottomSheetScrollView: ({ children }: any) => (
      <View testID="navigation-bottom-sheet-scroll">{children}</View>
    ),
  };
});

jest.mock("../app/icons", () => {
  const { View } = require("react-native");
  return {
    BikeIcon: () => <View testID="bike-icon" />,
    CarIcon: () => <View testID="car-icon" />,
    CloseIcon: () => <View testID="close-icon" />,
    TrainIcon: () => <View testID="train-icon" />,
    WalkingIcon: () => <View testID="walking-icon" />,
  };
});

describe("NavigationBottomSheet", () => {
  const mockedGetIsCrossCampus = getIsCrossCampus as jest.Mock;
  const mockedUseGetDirections = useGetDirections as jest.Mock;

  const buildOutdoorDirections = (mode: string) => ({
    mode,
    duration: "5 min",
    distance: "1 km",
    departure_message: "depart",
    polyline: "abc",
    steps: [],
  });

  beforeEach(() => {
    jest.clearAllMocks();

    useMapStore.setState({
      userLocation: undefined,
      selectedBuildingCode: undefined,
      currentBuildingCode: undefined,
      currentMode: MapMode.NONE,
    });

    useNavigationStore.setState({
      startLocation: undefined,
      endLocation: undefined,
      transitMode: undefined,
      currentDirections: undefined,
    });

    mockedGetIsCrossCampus.mockReturnValue(false);
    mockedUseGetDirections.mockReturnValue({
      data: {
        durationBlock: {
          type: "duration",
          durations: {
            driving: 300,
            transit: 480,
            walking: 720,
            bicycling: 240,
            shuttle: 1200,
          },
        },
        directionBlocks: [
          {
            type: "outdoor",
            directionsByMode: {
              driving: buildOutdoorDirections("driving"),
              transit: buildOutdoorDirections("transit"),
              walking: buildOutdoorDirections("walking"),
              bicycling: buildOutdoorDirections("bicycling"),
              shuttle: buildOutdoorDirections("shuttle"),
            },
          },
        ],
      },
      isLoading: false,
      isRefetching: false,
      isError: false,
    });
  });

  test("shows prompt when start location is not selected", () => {
    const { getByText, queryByText } = render(<NavigationBottomSheet />);

    expect(getByText("Please select a start location")).toBeTruthy();
    expect(queryByText("5 min")).toBeNull();
    expect(queryByText("2 min")).toBeNull();
  });

  test("pressing close calls closeSheet state update", () => {
    useMapStore.getState().setSelectedBuildingCode("MB");
    useMapStore.getState().setCurrentMode(MapMode.NAVIGATION);

    const { getByTestId } = render(<NavigationBottomSheet />);

    fireEvent.press(getByTestId("close-navigation"));

    expect(useMapStore.getState().currentMode).toBe(MapMode.NONE);
    expect(useMapStore.getState().selectedBuildingCode).toBeUndefined();
  });

  test("defaults to drive mode for non cross-campus navigation", async () => {
    useNavigationStore.getState().setStartLocation({
      latitude: 45.497,
      longitude: -73.579,
      name: "Start",
      code: "SGW",
    });
    useNavigationStore.getState().setEndLocation({
      latitude: 45.501,
      longitude: -73.577,
      name: "End",
      code: "SGW",
    });

    render(<NavigationBottomSheet />);

    await waitFor(() => {
      expect([
        TransitMode.driving,
        TransitMode.transit,
        TransitMode.walking,
        TransitMode.bicycling,
      ]).toContain(useNavigationStore.getState().transitMode);
    });

    expect(mockedGetIsCrossCampus).toHaveBeenCalled();
  });

  test("defaults to shuttle mode for cross-campus navigation", async () => {
    mockedGetIsCrossCampus.mockReturnValue(true);

    useNavigationStore.getState().setStartLocation({
      latitude: 45.497,
      longitude: -73.579,
      name: "Start",
      code: "SGW",
    });
    useNavigationStore.getState().setEndLocation({
      latitude: 45.46,
      longitude: -73.64,
      name: "End",
      code: "LOY",
    });

    const { getByText } = render(<NavigationBottomSheet />);

    await waitFor(() => {
      expect(useNavigationStore.getState().transitMode).toBe(
        TransitMode.shuttle,
      );
    });
  });

  test("pressing a transit chip updates selected mode", async () => {
    useNavigationStore.getState().setStartLocation({
      latitude: 45.497,
      longitude: -73.579,
      name: "Start",
      code: "SGW",
    });
    useNavigationStore.getState().setEndLocation({
      latitude: 45.501,
      longitude: -73.577,
      name: "End",
      code: "SGW",
    });

    const { getByText } = render(<NavigationBottomSheet />);

    fireEvent.press(getByText("12 min"));

    await waitFor(() => {
      expect(useNavigationStore.getState().transitMode).toBe(
        TransitMode.walking,
      );
    });
  });
});
