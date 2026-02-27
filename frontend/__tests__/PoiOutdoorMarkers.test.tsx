import { render } from "@testing-library/react-native";
import { useLocalSearchParams } from "expo-router";
import { useGetNearbyPoi } from "@/hooks/queries/poiQueries";
import PoiOutdoorMarkers from "../components/poi/PoiOutdoorMarkers";

jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(),
}));

jest.mock("@/hooks/queries/poiQueries", () => ({
  useGetNearbyPoi: jest.fn(),
}));

jest.mock("@expo/vector-icons/build/Ionicons", () => "Ionicons");

jest.mock("react-native-maps", () => {
  const { View } = require("react-native");

  return {
    Marker: ({ children, title, description, coordinate }: any) => (
      <View
        testID="poi-marker"
        accessibilityLabel={`marker-${title}`}
        accessibilityHint={description}
        accessibilityValue={{
          text: `${coordinate.latitude},${coordinate.longitude}`,
        }}
      >
        {children}
      </View>
    ),
  };
});

describe("PoiOutdoorMarkers", () => {
  const mockedUseLocalSearchParams = useLocalSearchParams as jest.Mock;
  const mockedUseGetNearbyPoi = useGetNearbyPoi as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockedUseLocalSearchParams.mockReturnValue({
      query: "coffee",
      poiLat: "45.497",
      poiLng: "-73.579",
      rankPref: "DISTANCE",
    });
  });

  test("calls useGetNearbyPoi with parsed query params", () => {
    mockedUseGetNearbyPoi.mockReturnValue({
      isLoading: true,
      data: null,
    });

    render(<PoiOutdoorMarkers />);

    expect(mockedUseGetNearbyPoi).toHaveBeenCalledWith(
      "coffee",
      45.497,
      -73.579,
      "DISTANCE",
    );
  });

  test("renders no markers while loading", () => {
    mockedUseGetNearbyPoi.mockReturnValue({
      isLoading: true,
      data: null,
    });

    const { queryAllByTestId } = render(<PoiOutdoorMarkers />);

    expect(queryAllByTestId("poi-marker")).toHaveLength(0);
  });

  test("renders markers with numeric coordinates from response", () => {
    mockedUseGetNearbyPoi.mockReturnValue({
      isLoading: false,
      data: {
        data: [
          {
            code: "poi-1",
            name: "Library",
            long_name: "Library",
            address: "1450 Guy St",
            latitude: "45.4959",
            longitude: "-73.5784",
            metro_accessible: false,
            services: [],
            departments: null,
            venues: null,
            accessibility: null,
          },
          {
            code: "poi-2",
            name: "Cafe",
            long_name: "Cafe",
            address: "1515 Ste Catherine",
            latitude: "45.4971",
            longitude: "-73.5802",
            metro_accessible: false,
            services: [],
            departments: null,
            venues: null,
            accessibility: null,
          },
        ],
      },
    });

    const { getByLabelText, queryAllByTestId } = render(<PoiOutdoorMarkers />);

    expect(queryAllByTestId("poi-marker")).toHaveLength(2);

    expect(getByLabelText("marker-Library").props.accessibilityValue.text).toBe(
      "45.4959,-73.5784",
    );
    expect(getByLabelText("marker-Cafe").props.accessibilityValue.text).toBe(
      "45.4971,-73.5802",
    );
  });
});
