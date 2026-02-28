import { getIsCrossCampus } from "@/app/utils/mapUtils";
import { MapMode, useMapStore } from "@/hooks/useMapStore";
import { useNavigationStore } from "@/hooks/useNavigationStore";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import NavigationBottomSheet from "../components/NavigationBottomSheet";

jest.mock("@/app/utils/mapUtils", () => ({
  getIsCrossCampus: jest.fn(),
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
    });

    mockedGetIsCrossCampus.mockReturnValue(false);
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
    });
    useNavigationStore.getState().setEndLocation({
      latitude: 45.501,
      longitude: -73.577,
      name: "End",
    });

    const { getByText } = render(<NavigationBottomSheet />);

    await waitFor(() => {
      expect(getByText("Drive")).toBeTruthy();
    });

    expect(mockedGetIsCrossCampus).toHaveBeenCalled();
  });

  test("defaults to shuttle mode for cross-campus navigation", async () => {
    mockedGetIsCrossCampus.mockReturnValue(true);

    useNavigationStore.getState().setStartLocation({
      latitude: 45.497,
      longitude: -73.579,
      name: "Start",
    });
    useNavigationStore.getState().setEndLocation({
      latitude: 45.46,
      longitude: -73.64,
      name: "End",
    });

    const { getByText } = render(<NavigationBottomSheet />);

    await waitFor(() => {
      expect(getByText("Shuttle")).toBeTruthy();
    });
  });

  test("pressing a transit chip updates selected mode", async () => {
    useNavigationStore.getState().setStartLocation({
      latitude: 45.497,
      longitude: -73.579,
      name: "Start",
    });
    useNavigationStore.getState().setEndLocation({
      latitude: 45.501,
      longitude: -73.577,
      name: "End",
    });

    const { getByText } = render(<NavigationBottomSheet />);

    fireEvent.press(getByText("4 min"));

    await waitFor(() => {
      expect(getByText("Bike")).toBeTruthy();
    });
  });
});
