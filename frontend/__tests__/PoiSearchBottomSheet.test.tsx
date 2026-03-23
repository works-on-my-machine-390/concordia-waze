import { getDistanceInMeters } from "@/app/utils/mapUtils";
import {
  TextSearchRankPreferenceType,
  useGetNearbyPoi,
} from "@/hooks/queries/poiQueries";
import { MapMode, useMapStore } from "@/hooks/useMapStore";
import {
  NavigationPhase,
} from "@/hooks/useNavigationStore";
import { fireEvent } from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import PoiSearchBottomSheet from "../components/poi/PoiSearchBottomSheet";
import { renderWithProviders } from "../test_utils/renderUtils";

const mockUseNavigationStore = jest.fn();
const mockFindAndSetStartLocation = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
}));

jest.mock("@/hooks/queries/poiQueries", () => ({
  TextSearchRankPreferenceType: {
    DISTANCE: "DISTANCE",
    RELEVANCE: "RELEVANCE",
  },
  useGetNearbyPoi: jest.fn(),
}));

jest.mock("@/app/utils/mapUtils", () => ({
  getDistanceInMeters: jest.fn(),
}));

jest.mock("@/hooks/useMapStore", () => ({
  MapMode: {
    POI: "POI",
    BUILDING: "BUILDING",
    SETTINGS: "SETTINGS",
    NAVIGATION: "NAVIGATION",
    NONE: "NONE",
  },
  useMapStore: jest.fn(),
}));

jest.mock("@/hooks/useNavigationStore", () => ({
  NavigationPhase: {
    PREPARATION: "PREPARATION",
    ACTIVE: "ACTIVE",
  },
  useNavigationStore: () => mockUseNavigationStore(),
}));

jest.mock("@/hooks/useStartLocation", () => ({
  __esModule: true,
  default: () => ({
    findAndSetStartLocation: mockFindAndSetStartLocation,
  }),
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
      <View testID="poi-bottom-sheet">{children}</View>
    )),
    BottomSheetScrollView: ({ children }: any) => (
      <View testID="poi-bottom-sheet-scroll">{children}</View>
    ),
  };
});

jest.mock("../components/poi/PoiSearchBottomSheetHeader", () => {
  const { Pressable, Text } = require("react-native");
  return function MockHeader({ onClose }: { onClose: () => void }) {
    return (
      <Pressable testID="poi-header-close" onPress={onClose}>
        <Text>Nearby results</Text>
      </Pressable>
    );
  };
});

jest.mock("../components/poi/PoiSearchRankPreferenceFilter", () => {
  const { Pressable, Text } = require("react-native");
  return function MockFilter({ onChange }: { onChange: () => void }) {
    return (
      <Pressable testID="rank-filter" onPress={onChange}>
        <Text>Rank filter</Text>
      </Pressable>
    );
  };
});

jest.mock("../components/poi/PoiSearchResult", () => {
  const { Pressable, Text } = require("react-native");
  return function MockPoiSearchResult({
    result,
    onPress,
    onDirectionsPress,
  }: any) {
    return (
      <Pressable
        testID="poi-result-row"
        accessibilityLabel={`result-${result.code}`}
        onPress={() => onPress(result)}
      >
        <Text>{result.name}</Text>
        <Pressable
          testID={`directions-${result.code}`}
          onPress={() => onDirectionsPress(result)}
        >
          <Text>Directions</Text>
        </Pressable>
      </Pressable>
    );
  };
});

describe("PoiSearchBottomSheet", () => {
  const mockedUseLocalSearchParams = useLocalSearchParams as jest.Mock;
  const mockedUseRouter = useRouter as jest.Mock;
  const mockedUseGetNearbyPoi = useGetNearbyPoi as jest.Mock;
  const mockedGetDistanceInMeters = getDistanceInMeters as jest.Mock;
  const mockedUseMapStore = jest.mocked(useMapStore);

  const mockSetParams = jest.fn();
  const mockRefetch = jest.fn();
  const mockCloseSheet = jest.fn();
  const mockSetCurrentMode = jest.fn();
  const mockSetEndLocation = jest.fn();
  const mockSetNavigationPhase = jest.fn();

  const mockPoiResults = [
    {
      code: "poi-far",
      name: "Far Place",
      long_name: "Far Place",
      address: "100 Main",
      latitude: 45.51,
      longitude: -73.6,
      metro_accessible: false,
      services: [],
      departments: null,
      venues: null,
      accessibility: null,
    },
    {
      code: "poi-near",
      name: "Near Place",
      long_name: "Near Place",
      address: "200 Main",
      latitude: 45.5,
      longitude: -73.58,
      metro_accessible: false,
      services: [],
      departments: null,
      venues: null,
      accessibility: null,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockedUseRouter.mockReturnValue({
      setParams: mockSetParams,
    });

    mockedUseLocalSearchParams.mockReturnValue({
      query: "coffee",
      poiLat: "45.497",
      poiLng: "-73.579",
      rankPref: TextSearchRankPreferenceType.RELEVANCE,
    });

    mockedUseGetNearbyPoi.mockReturnValue({
      isLoading: false,
      data: { data: mockPoiResults },
      refetch: mockRefetch,
    });

    mockedUseMapStore.mockReturnValue({
      closeSheet: mockCloseSheet,
      setCurrentMode: mockSetCurrentMode,
      userLocation: undefined,
    });

    mockUseNavigationStore.mockReturnValue({
      startLocation: undefined,
      setEndLocation: mockSetEndLocation,
      setNavigationPhase: mockSetNavigationPhase,
    });

    mockedGetDistanceInMeters.mockImplementation((poi: { latitude: number }) =>
      poi.latitude === 45.51 ? 300 : 100,
    );
  });

  test("shows loading indicator when query is loading", () => {
    mockedUseGetNearbyPoi.mockReturnValue({
      isLoading: true,
      data: null,
      refetch: mockRefetch,
    });

    const { getByTestId, queryAllByTestId } = renderWithProviders(
      <PoiSearchBottomSheet />,
    );

    expect(getByTestId("poi-bottom-sheet")).toBeTruthy();
    expect(getByTestId("poi-bottom-sheet-scroll")).toBeTruthy();
    expect(queryAllByTestId("poi-result-row")).toHaveLength(0);
  });

  test("pressing result updates camera params and invokes moveCamera", () => {
    const moveCamera = jest.fn();

    const { getByLabelText } = renderWithProviders(
      <PoiSearchBottomSheet moveCamera={moveCamera} />,
    );

    fireEvent.press(getByLabelText("result-poi-far"));

    expect(mockSetParams).toHaveBeenCalledWith({
      camLat: 45.51,
      camLng: -73.6,
    });
    expect(moveCamera).toHaveBeenCalledWith({
      latitude: 45.51,
      longitude: -73.6,
    });
  });

  test("pressing rank filter triggers query refetch", () => {
    const { getByTestId } = renderWithProviders(<PoiSearchBottomSheet />);

    fireEvent.press(getByTestId("rank-filter"));

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  test("sorts results by computed distance when rank preference is DISTANCE", () => {
    mockedUseLocalSearchParams.mockReturnValue({
      query: "coffee",
      poiLat: "45.497",
      poiLng: "-73.579",
      rankPref: TextSearchRankPreferenceType.DISTANCE,
    });

    mockedUseMapStore.mockReturnValue({
      closeSheet: jest.fn(),
      userLocation: { coords: { latitude: 45.5, longitude: -73.57 } },
    });

    const { getAllByTestId } = renderWithProviders(<PoiSearchBottomSheet />);

    const rows = getAllByTestId("poi-result-row");
    expect(rows[0].props.accessibilityLabel).toBe("result-poi-near");
    expect(rows[1].props.accessibilityLabel).toBe("result-poi-far");
  });

  test("pressing header close clears poi params and closes sheet", () => {
    const { getByTestId } = renderWithProviders(<PoiSearchBottomSheet />);

    fireEvent.press(getByTestId("poi-header-close"));

    expect(mockSetParams).toHaveBeenCalledWith({
      query: "",
      poiLat: undefined,
      poiLng: undefined,
    });
    expect(mockCloseSheet).toHaveBeenCalledTimes(1);
  });

  test("pressing directions moves to navigation and infers start when missing", () => {
    const { getByTestId } = renderWithProviders(<PoiSearchBottomSheet />);

    fireEvent.press(getByTestId("directions-poi-near"));

    expect(mockSetCurrentMode).toHaveBeenCalledWith(MapMode.NAVIGATION);
    expect(mockSetEndLocation).toHaveBeenCalledWith({
      latitude: 45.5,
      longitude: -73.58,
      name: "Near Place",
      code: "",
    });
    expect(mockSetNavigationPhase).toHaveBeenCalledWith(
      NavigationPhase.PREPARATION,
    );
    expect(mockFindAndSetStartLocation).toHaveBeenCalledWith({
      latitude: 45.5,
      longitude: -73.58,
      name: "Near Place",
      code: "",
    });
  });

  test("pressing directions does not infer start if start already exists", () => {
    mockUseNavigationStore.mockReturnValue({
      startLocation: {
        name: "Start",
        latitude: 45.49,
        longitude: -73.57,
        code: "MB",
      },
      setEndLocation: mockSetEndLocation,
      setNavigationPhase: mockSetNavigationPhase,
    });

    const { getByTestId } = renderWithProviders(<PoiSearchBottomSheet />);

    fireEvent.press(getByTestId("directions-poi-far"));

    expect(mockFindAndSetStartLocation).not.toHaveBeenCalled();
  });
});
