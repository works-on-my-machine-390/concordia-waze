import { getDistanceInMeters } from "@/app/utils/mapUtils";
import {
  TextSearchRankPreferenceType,
  useGetNearbyPoi,
} from "@/hooks/queries/poiQueries";
import { fireEvent, render } from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import PoiSearchBottomSheet from "../components/poi/PoiSearchBottomSheet";

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
  const { Text } = require("react-native");
  return function MockHeader() {
    return <Text>Nearby results</Text>;
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

  const mockSetParams = jest.fn();
  const mockRefetch = jest.fn();

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

    const { getByTestId, queryAllByTestId } = render(
      <PoiSearchBottomSheet onDirectionsPress={jest.fn()} />,
    );

    expect(getByTestId("poi-bottom-sheet")).toBeTruthy();
    expect(getByTestId("poi-bottom-sheet-scroll")).toBeTruthy();
    expect(queryAllByTestId("poi-result-row")).toHaveLength(0);
  });

  test("pressing result updates camera params and invokes moveCamera", () => {
    const moveCamera = jest.fn();

    const { getByLabelText } = render(
      <PoiSearchBottomSheet
        onDirectionsPress={jest.fn()}
        moveCamera={moveCamera}
        userLocation={{ latitude: 45.5, longitude: -73.57 }}
      />,
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

  test("pressing directions forwards selected result", () => {
    const onDirectionsPress = jest.fn();

    const { getByTestId } = render(
      <PoiSearchBottomSheet onDirectionsPress={onDirectionsPress} />,
    );

    fireEvent.press(getByTestId("directions-poi-near"));

    expect(onDirectionsPress).toHaveBeenCalledWith(
      expect.objectContaining({ code: "poi-near", name: "Near Place" }),
    );
  });

  test("pressing rank filter triggers query refetch", () => {
    const { getByTestId } = render(
      <PoiSearchBottomSheet onDirectionsPress={jest.fn()} />,
    );

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

    const { getAllByTestId } = render(
      <PoiSearchBottomSheet
        onDirectionsPress={jest.fn()}
        userLocation={{ latitude: 45.5, longitude: -73.57 }}
      />,
    );

    const rows = getAllByTestId("poi-result-row");
    expect(rows[0].props.accessibilityLabel).toBe("result-poi-near");
    expect(rows[1].props.accessibilityLabel).toBe("result-poi-far");
  });
});
