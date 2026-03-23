import { useGetBuildingFloors } from "@/hooks/queries/indoorMapQueries";
import { renderWithProviders } from "@/test_utils/renderUtils";
import { fireEvent } from "@testing-library/react-native";
import IndoorMapContainer from "../components/indoor/IndoorMapContainer";

const mockSetParams = jest.fn();

jest.mock("expo-router", () => ({
  router: {
    setParams: (...args: any[]) => mockSetParams(...args),
  },
  useLocalSearchParams: jest.fn(() => ({
    buildingCode: "H",
    selectedFloor: "1",
  })),
}));

jest.mock("@/hooks/queries/indoorMapQueries");

jest.mock("@/hooks/queries/buildingQueries", () => ({
  useGetBuildingDetails: jest.fn(() => ({
    data: { long_name: "Hall Building", metro_accessible: true },
  })),
}));

jest.mock("../components/indoor/NoAccessibleRouteNotice", () => {
  const { Text } = require("react-native");
  return function MockNoAccessibleRouteNotice({ visible }: any) {
    return <Text testID="no-accessible-route">{String(visible)}</Text>;
  };
});

jest.mock("../components/indoor/FloorPlanViewer", () => {
  const { View, Text } = require("react-native");
  return function MockFloorPlanViewer(props: any) {
    return (
      <View testID="floor-plan-viewer">
        <Text>{`Floor ${props.floor?.number}`}</Text>
      </View>
    );
  };
});

jest.mock("../components/indoor/FloorSelector", () => {
  const { View, TouchableOpacity, Text } = require("react-native");
  return function MockFloorSelector({ floors, onSelectFloor }: any) {
    return (
      <View testID="floor-selector">
        {floors.map((floor: any) => (
          <TouchableOpacity
            key={floor.number}
            testID={`floor-button-${floor.number}`}
            onPress={() => onSelectFloor(floor.number)}
          >
            <Text>{`Floor ${floor.number}`}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };
});

const mockFloorsData = {
  floors: [
    {
      number: 1,
      name: "Floor 1",
      imgPath: "floormaps/H_1.svg",
      vertices: [],
      edges: [],
      pois: [],
    },
    {
      number: 9,
      name: "Floor 9",
      imgPath: "floormaps/H_9.svg",
      vertices: [],
      edges: [],
      pois: [],
    },
  ],
};

describe("IndoorMapContainer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders loading state when fetching building floors", () => {
    (useGetBuildingFloors as jest.Mock).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    const { getByText } = renderWithProviders(
      <IndoorMapContainer buildingCode="H" />,
    );

    expect(getByText("Loading floor plans...")).toBeTruthy();
  });

  test("renders empty state when no floors are available", () => {
    (useGetBuildingFloors as jest.Mock).mockReturnValue({
      data: { floors: [] },
      isLoading: false,
      error: null,
    });

    const { getByText } = renderWithProviders(
      <IndoorMapContainer buildingCode="H" />,
    );

    expect(getByText("No floor plans available")).toBeTruthy();
  });

  test("renders FloorPlanViewer and FloorSelector when data is loaded", () => {
    (useGetBuildingFloors as jest.Mock).mockReturnValue({
      data: mockFloorsData,
      isLoading: false,
      error: null,
    });

    const { getByTestId, getAllByText } = renderWithProviders(
      <IndoorMapContainer buildingCode="H" />,
    );

    expect(getByTestId("floor-plan-viewer")).toBeTruthy();
    expect(getByTestId("floor-selector")).toBeTruthy();
    expect(getAllByText("Floor 1").length).toBeGreaterThan(0);
  });

  test("selecting a floor updates selectedFloor via router params", () => {
    (useGetBuildingFloors as jest.Mock).mockReturnValue({
      data: mockFloorsData,
      isLoading: false,
      error: null,
    });

    const { getByTestId } = renderWithProviders(
      <IndoorMapContainer buildingCode="H" />,
    );

    fireEvent.press(getByTestId("floor-button-9"));

    expect(mockSetParams).toHaveBeenCalledWith({
      selectedFloor: "9",
      selectedPoiName: null,
    });
  });
});
