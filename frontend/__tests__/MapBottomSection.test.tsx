import { MapMode, useMapStore } from "@/hooks/useMapStore";
import { NavigationPhase, useNavigationStore } from "@/hooks/useNavigationStore";
import { fireEvent, render } from "@testing-library/react-native";
import MapBottomSection from "../components/MapBottomSection";

const mockPoiSearchBottomSheet = jest.fn();

jest.mock("../components/MapSettingsButton", () => {
  const { TouchableOpacity, Text } = require("react-native");
  return function MockMapSettingsButton({ onPress }: any) {
    return (
      <TouchableOpacity testID="settings-button" onPress={onPress}>
        <Text>Settings Button</Text>
      </TouchableOpacity>
    );
  };
});

jest.mock("../components/LocationButton", () => {
  const { TouchableOpacity, Text } = require("react-native");
  return function MockLocationButton({ onPress }: any) {
    return (
      <TouchableOpacity testID="location-button" onPress={onPress}>
        <Text>Location Button</Text>
      </TouchableOpacity>
    );
  };
});

jest.mock("../components/BuildingBottomSheet", () => {
  const { View } = require("react-native");
  return function MockBuildingBottomSheet() {
    return <View testID="building-bottom-sheet" />;
  };
});

jest.mock("../components/NavigationBottomSheet", () => {
  const { View } = require("react-native");
  return function MockNavigationBottomSheet() {
    return <View testID="navigation-bottom-sheet" />;
  };
});

jest.mock("../components/activeNavigation/ActiveNavigationBottomSheet", () => {
  const { View } = require("react-native");
  return function MockActiveNavigationBottomSheet() {
    return <View testID="active-navigation-bottom-sheet" />;
  };
});

jest.mock("../components/MapSettingsBottomSheet", () => {
  const { View } = require("react-native");
  return function MockMapSettingsBottomSheet() {
    return <View testID="map-settings-bottom-sheet" />;
  };
});

jest.mock("../components/poi/PoiSearchBottomSheet", () => {
  const { View } = require("react-native");
  return function MockPoiSearchBottomSheet(props: any) {
    mockPoiSearchBottomSheet(props);
    return <View testID="poi-bottom-sheet" />;
  };
});

jest.mock("../components/classes/NextClassDrawer", () => {
  const { View } = require("react-native");
  return function MockNextClassDrawer() {
    return <View testID="next-class-drawer" />;
  };
});

function resetMapStore() {
  useMapStore.setState({
    userLocation: undefined,
    selectedBuildingCode: undefined,
    currentBuildingCode: undefined,
    currentMode: MapMode.NONE,
  });
  useNavigationStore.setState({
    navigationPhase: undefined,
  });
}

describe("MapBottomSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMapStore();
  });

  test("renders bottom buttons and triggers goToMyLocation", () => {
    const goToMyLocation = jest.fn();

    const { getByTestId } = render(
      <MapBottomSection goToMyLocation={goToMyLocation} />,
    );

    fireEvent.press(getByTestId("location-button"));

    expect(goToMyLocation).toHaveBeenCalledTimes(1);
  });

  test("settings button toggles map mode between NONE and SETTINGS", () => {
    const { getByTestId } = render(
      <MapBottomSection goToMyLocation={jest.fn()} />,
    );

    fireEvent.press(getByTestId("settings-button"));
    expect(useMapStore.getState().currentMode).toBe(MapMode.SETTINGS);

    fireEvent.press(getByTestId("settings-button"));
    expect(useMapStore.getState().currentMode).toBe(MapMode.NONE);
  });

  test("renders POI sheet in POI mode and forwards moveCamera", () => {
    useMapStore.getState().setCurrentMode(MapMode.POI);
    const moveCamera = jest.fn();

    const { getByTestId } = render(
      <MapBottomSection goToMyLocation={jest.fn()} moveCamera={moveCamera} />,
    );

    expect(getByTestId("poi-bottom-sheet")).toBeTruthy();
    expect(mockPoiSearchBottomSheet).toHaveBeenCalledWith(
      expect.objectContaining({
        moveCamera,
      }),
    );
  });

  test("renders BuildingBottomSheet in BUILDING mode", () => {
    useMapStore.getState().setCurrentMode(MapMode.BUILDING);

    const { getByTestId, queryByTestId } = render(
      <MapBottomSection goToMyLocation={jest.fn()} />,
    );

    expect(getByTestId("building-bottom-sheet")).toBeTruthy();
    expect(queryByTestId("navigation-bottom-sheet")).toBeNull();
    expect(queryByTestId("map-settings-bottom-sheet")).toBeNull();
  });

  test("renders NavigationBottomSheet in NAVIGATION mode", () => {
    useMapStore.getState().setCurrentMode(MapMode.NAVIGATION);
    useNavigationStore.setState({ navigationPhase: NavigationPhase.PREPARATION });

    const { getByTestId, queryByTestId } = render(
      <MapBottomSection goToMyLocation={jest.fn()} />,
    );

    expect(getByTestId("navigation-bottom-sheet")).toBeTruthy();
    expect(queryByTestId("building-bottom-sheet")).toBeNull();
    expect(queryByTestId("map-settings-bottom-sheet")).toBeNull();
  });

  test("renders MapSettingsBottomSheet in SETTINGS mode", () => {
    useMapStore.getState().setCurrentMode(MapMode.SETTINGS);

    const { getByTestId, queryByTestId } = render(
      <MapBottomSection goToMyLocation={jest.fn()} />,
    );

    expect(getByTestId("map-settings-bottom-sheet")).toBeTruthy();
    expect(queryByTestId("building-bottom-sheet")).toBeNull();
    expect(queryByTestId("navigation-bottom-sheet")).toBeNull();
  });

  test("renders NextClassDrawer when nextClass is provided", () => {
    const nextClass = {
      className: "SOEN 363",
      buildingLatitude: 0,
      buildingLongitude: 0,
      floorNumber: 0,
      roomX: 0,
      roomY: 0,
      item: {
        type: "Lecture" as const, 
        section: "WW",
        day: "FRI",
        startTime: "16:00",
        endTime: "17:15",
        buildingCode: "MB",
        room: "S2.210",
        origin: "manual" as const,
      },
    };

    const { getByTestId } = render(
      <MapBottomSection goToMyLocation={jest.fn()} nextClass={nextClass} />,
    );

    expect(getByTestId("next-class-drawer")).toBeTruthy();
  });

  test("sets floatingButtonsBottom to 0 when no sheet is open", () => {
    useMapStore.getState().setCurrentMode(MapMode.NONE);

    const { getByTestId } = render(
      <MapBottomSection goToMyLocation={jest.fn()} />,
    );

    const floatingButtonsContainer = getByTestId("floating-buttons-container");
    const styleArray = floatingButtonsContainer.props.style;
    const bottomStyle = Array.isArray(styleArray) 
      ? styleArray.find((s: any) => s?.bottom !== undefined)
      : styleArray;
    expect(bottomStyle?.bottom).toBe(0);
  });

  test("sets floatingButtonsBottom to 20% of screen height when small snap point is active", () => {
    const { height } = require("react-native").Dimensions.get("window");
    const expectedBottom = height * 0.2;

    useMapStore.getState().setCurrentMode(MapMode.POI);

    const { getByTestId } = render(
      <MapBottomSection goToMyLocation={jest.fn()} />,
    );

    const floatingButtonsContainer = getByTestId("floating-buttons-container");
    const styleArray = floatingButtonsContainer.props.style;
    const bottomStyle = Array.isArray(styleArray)
      ? styleArray.find((s: any) => s?.bottom !== undefined)
      : styleArray;
    
    expect(bottomStyle?.bottom).toBe(expectedBottom);
  });

  test("hides floating buttons when large sheet is open and index is 1 or more", () => {
    useMapStore.getState().setCurrentMode(MapMode.BUILDING);

    const { queryByTestId, getByTestId } = render(
      <MapBottomSection goToMyLocation={jest.fn()} />,
    );

    // Initially index is 0 (small snap point), so buttons should be visible
    expect(queryByTestId("floating-buttons-container")).toBeTruthy();

    // Simulate sheet expanding to large index (>=1)
    const buildingSheet = getByTestId("building-bottom-sheet");
    fireEvent(buildingSheet, "onSheetIndexChange", 1);

    // After index changes to 1+, buttons should be hidden
    expect(queryByTestId("floating-buttons-container")).toBeNull();
  });
});
